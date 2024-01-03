import { UNKNOWN, ON, OFF } from '../../constants.mjs';
import { InvalidGameError } from '../errors.mjs';
import { perlRegexp } from './isolated-rules/perl-regexp.mjs';

const IMPLICATIONS_CACHE = Symbol();

function buildImplications(auxRules, state) {
  const implications = [];
  for (let i = 0; i < state.board.length * 2; ++i) {
    implications.push([]);
  }
  const cacheMap = state.getCache(IMPLICATIONS_CACHE);
  for (const auxRule of auxRules) {
    const initial = new Uint8Array(auxRule.cellIndices.length);
    state.readBoardLine(initial, auxRule.cellIndices);
    let cached = cacheMap.get(auxRule);
    let cacheMatch = Boolean(cached) && cached.state.length === initial.length;
    let unknownCount = 0;
    for (let i = 0; i < initial.length; ++i) {
      cacheMatch &&= initial[i] === cached.state[i];
      unknownCount += (initial[i] === UNKNOWN);
    }
    if (unknownCount < 2) {
      continue;
    }
    if (!cacheMatch) {
      cached = { state: initial, results: [] };
      cacheMap.set(auxRule, cached);
      for (let i = 0; i < initial.length; ++i) {
        if (initial[i] !== UNKNOWN) {
          continue;
        }

        const boardLineOn = new Uint8Array(initial);
        const boardLineOff = new Uint8Array(initial);
        boardLineOn[i] = ON;
        boardLineOff[i] = OFF;
        try {
          auxRule.solve(boardLineOn);
        } catch (e) {
          boardLineOn[i] = OFF; // set up a contradiction as this state is invalid
        }
        try {
          auxRule.solve(boardLineOff);
        } catch (e) {
          boardLineOff[i] = ON; // set up a contradiction as this state is invalid
        }

        const impOff = [];
        const impOn = [];
        for (let j = 0; j < initial.length; ++j) {
          if (initial[j] === UNKNOWN) {
            if (boardLineOn[j] !== UNKNOWN) {
              impOn.push(auxRule.cellIndices[j] * 2 + (boardLineOn[j] === ON ? 1 : 0));
            }
            if (boardLineOff[j] !== UNKNOWN) {
              impOff.push(auxRule.cellIndices[j] * 2 + (boardLineOff[j] === ON ? 1 : 0));
            }
          }
        }
        cached.results.push({ cell: auxRule.cellIndices[i], impOn, impOff });
      }
    }
    for (const { cell, impOn, impOff } of cached.results) {
      implications[cell * 2].push(...impOff);
      implications[cell * 2 + 1].push(...impOn);
    }
  }
  return implications;
}

function resolveImplications(implications, cell, value, depth) {
  const v0 = cell * 2 + (value === ON ? 1 : 0);
  const resolved = new Map([[v0, { depth: 0, prev: -1 }]]);
  let cur = [v0];
  for (let d = 0; d < depth && cur.length; ++d) {
    let next = [];
    for (const v of cur) {
      for (const n of implications[v]) {
        if (!resolved.has(n)) {
          resolved.set(n, { depth: d + 1, prev: v });
          next.push(n);
        }
        if (resolved.has(n ^ 1)) {
          // found a contradiction
          return { contradiction: true, resolved, index: n >>> 1 };
        }
      }
    }
    cur = next;
  }
  return { contradiction: false, resolved };
}

function findPath(resolved, v) {
  const result = [];
  for (let p = v; p !== -1; p = resolved.get(p).prev) {
    result.push(p);
  }
  return result.map((r) => r >>> 1);
}

function applyToState(state, onImp, offImp) {
  if (onImp.contradiction || offImp.contradiction) {
    const imp = onImp.contradiction ? offImp : onImp;
    for (const p of imp.resolved.keys()) {
      state.board[p >>> 1] = (p & 1) ? ON : OFF;
    }
    state.changed = true;
  } else {
    for (const p of onImp.resolved.keys()) {
      if (offImp.resolved.has(p)) {
        state.board[p >>> 1] = (p & 1) ? ON : OFF;
        state.changed = true;
      }
    }
  }
}

export const implications = ({
  implicationFinder = perlRegexp,
  maxDepth = Number.POSITIVE_INFINITY,
} = {}) => (rules) => {
  const auxRules = rules.map(({ raw, cellIndices }) => ({
    cellIndices,
    solve: implicationFinder(raw),
  }));

  return function* (state, { hint, sharedState }) {
    let implications = sharedState.get(implicationFinder);
    if (!implications) {
      implications = buildImplications(auxRules, state);
      sharedState.set(implicationFinder, implications);
    }

    const impacts = new Map();
    let best = { score: Number.NEGATIVE_INFINITY, hint: null };
    for (let cell = 0; cell < state.board.length; ++cell) {
      if (state.board[cell] !== UNKNOWN) {
        continue;
      }
      const onImp = resolveImplications(implications, cell, ON, maxDepth);
      const offImp = resolveImplications(implications, cell, OFF, maxDepth);
      if (onImp.contradiction && offImp.contradiction) {
        throw new InvalidGameError('no possible state', cell);
      }
      if (!onImp.contradiction && !offImp.contradiction) {
        impacts.set(cell, { on: onImp.resolved.size, off: offImp.resolved.size });
      }
      if (hint) {
        let score = Number.NEGATIVE_INFINITY;
        let hintDetail = null;
        if (onImp.contradiction || offImp.contradiction) {
          const invalidImp = onImp.contradiction ? onImp : offImp;
          const validImp = onImp.contradiction ? offImp : onImp;
          const contradiction = invalidImp.index << 1;
          const path = [
            ...findPath(invalidImp.resolved, contradiction).reverse(),
            ...findPath(invalidImp.resolved, contradiction ^ 1),
          ];
          score = validImp.resolved.size - path.length * state.board.length;
          hintDetail = { type: 'contradiction', paths: [path] };
        } else {
          let bestDepth = Number.POSITIVE_INFINITY;
          let bestTarget = null;
          let total = 0;
          for (const [p, r1] of onImp.resolved) {
            const r2 = offImp.resolved.get(p);
            if (r2) {
              ++total;
              if (r1.depth + r2.depth < bestDepth) {
                bestDepth = r1.depth + r2.depth;
                bestTarget = p;
              }
            }
          }
          if (bestTarget !== null) {
            score = total - bestDepth * state.board.length;
            hintDetail = {
              type: 'regardless',
              paths: [
                findPath(onImp.resolved, bestTarget).reverse(),
                findPath(offImp.resolved, bestTarget).reverse(),
              ],
            };
          }
        }
        if (score > best.score) {
          best = { score, onImp, offImp, hint: hintDetail };
        }
      } else {
        applyToState(state, onImp, offImp);
      }
    }
    sharedState.set('impacts', impacts);
    if (hint && best.hint) {
      applyToState(state, best.onImp, best.offImp);
      yield { hint: best.hint };
    }
  };
};
