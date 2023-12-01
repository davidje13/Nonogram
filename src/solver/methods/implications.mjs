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
  const resolved = new Set([v0]);
  let cur = [v0];
  for (let d = 0; d < depth && cur.length; ++d) {
    let next = [];
    for (const v of cur) {
      for (const n of implications[v]) {
        if (resolved.has(n ^ 1)) {
          return null; // found a contradiction
        }
        if (!resolved.has(n)) {
          resolved.add(n);
          next.push(n);
        }
      }
    }
    cur = next;
  }
  return resolved;
}

export const implications = ({
  implicationFinder = perlRegexp,
  maxDepth = Number.POSITIVE_INFINITY,
} = {}) => (rules) => {
  const auxRules = rules.map(({ raw, cellIndices }) => ({
    cellIndices,
    solve: implicationFinder(raw),
  }));

  return function* (state, { sharedState }) {
    let implications = sharedState.get(implicationFinder);
    if (!implications) {
      implications = buildImplications(auxRules, state);
      sharedState.set(implicationFinder, implications);
    }
    const impacts = new Map();
    for (let cell = 0; cell < state.board.length; ++cell) {
      if (state.board[cell] !== UNKNOWN) {
        continue;
      }
      const onImp = resolveImplications(implications, cell, ON, maxDepth);
      const offImp = resolveImplications(implications, cell, OFF, maxDepth);
      if (onImp !== null && offImp !== null) {
        for (const p of onImp) {
          if (offImp.has(p)) {
            state.board[p >>> 1] = (p & 1) ? ON : OFF;
            state.changed = true;
          }
        }
        impacts.set(cell, { on: onImp.size, off: offImp.size });
      } else if (onImp !== null || offImp !== null) {
        for (const p of (onImp ?? offImp)) {
          state.board[p >>> 1] = (p & 1) ? ON : OFF;
        }
        state.changed = true;
      } else {
        throw new InvalidGameError(`cell at index ${cell} can be neither on nor off`);
      }
    }
    sharedState.set('impacts', impacts);
  };
};
