import { UNKNOWN, ON, OFF } from '../../constants.mjs';
import { InvalidGameError } from '../errors.mjs';
import { perlRegexp } from './isolated-rules/perl-regexp.mjs';
import { makeCellRuleLookup } from './utils/rules.mjs';

// TODO: the time complexity of this approach can be improved by using https://en.wikipedia.org/wiki/2-satisfiability
// (though for normal sized grids, buildImplications is the slower part, which remains the input in 2-satisfiability)

const IMPLICATIONS_CACHE = Symbol();

function buildImplications(auxRules, state) {
  const implications = [];
  for (let i = 0; i < state.board.length * 2; ++i) {
    implications.push([]);
  }
  const cacheMap = state.getCache(IMPLICATIONS_CACHE);
  for (const auxRule of auxRules.rules) {
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

function beginImplications(cell, value) {
  const v0 = cell * 2 + (value === ON ? 1 : 0);
  return { resolved: new Map([[v0, { depth: 0, prev: [] }]]), contradiction: false, dead: false };
}

function resolveImplications(implications, imp) {
  const { resolved } = imp;
  let cur = [...resolved.keys()];
  for (let d = 0; cur.length; ++d) {
    let next = [];
    for (const v of cur) {
      const o = { depth: resolved.get(v).depth + 1, prev: [v] };
      for (const n of implications[v]) {
        if (!resolved.has(n)) {
          resolved.set(n, o);
          next.push(n);
        }
        if (resolved.has(n ^ 1)) {
          // found a contradiction
          imp.contradiction = true;
          imp.conflicts = [n];
          return;
        }
      }
    }
    cur = next;
  }
  imp.contradiction = false;
}

function addImplications(imp, auxRules, state) {
  const ruleStates = auxRules.rules.map((auxRule) => {
    const line = new Uint8Array(auxRule.cellIndices.length);
    state.readBoardLine(line, auxRule.cellIndices);
    return { inputs: [], line, auxRule };
  });
  for (const c of imp.resolved.keys()) {
    for (const { ruleIndex, cellIndex } of auxRules.cellRuleLookup.get(c >>> 1)) {
      const s = ruleStates[ruleIndex];
      s.inputs.push(c);
      s.line[cellIndex] = (c & 1) ? ON : OFF;
    }
  }

  let any = false;
  for (const { inputs, line, auxRule } of ruleStates) {
    if (inputs.length < 2) {
      continue; // already accounted for by normal implications
    }
    const unknowns = [];
    for (let i = 0; i < line.length; ++i) {
      if (line[i] === UNKNOWN) {
        unknowns.push(i);
      }
    }
    try {
      auxRule.solve(line);
    } catch (e) {
      const o = { depth: 0, prev: [] };
      for (const n of inputs) {
        imp.resolved.set(n ^ 1, o);
      }
      imp.contradiction = true;
      imp.conflicts = inputs;
      return;
    }
    const o = {
      depth: Math.max(...inputs.map((v) => imp.resolved.get(v).depth)) + 1,
      prev: inputs,
    };
    for (const j of unknowns) {
      if (line[j] !== UNKNOWN) {
        const n = auxRule.cellIndices[j] * 2 + (line[j] === ON ? 1 : 0);
        if ((imp.resolved.get(n)?.depth ?? Number.POSITIVE_INFINITY) > o.depth) {
          imp.resolved.set(n, o);
          any = true;
        }
        if (imp.resolved.has(n ^ 1)) {
          // found a contradiction
          imp.contradiction = true;
          imp.conflicts = [n];
          return;
        }
      }
    }
  }
  if (!any) {
    imp.dead = true;
  }
}

function findLinks(resolved, target, reverse = false) {
  const result = [];
  const visited = new Set();
  const next = [target];
  while (next.length) {
    const p = next.pop();
    if (visited.has(p)) {
      continue;
    }
    visited.add(p);
    for (const link of resolved.get(p).prev) {
      result.push(reverse ? [link >>> 1, p >>> 1] : [p >>> 1, link >>> 1]);
      next.push(link);
    }
  }
  return result;
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

function buildHint(cell, onImp, offImp, scoreLengthMult) {
  if (onImp.contradiction || offImp.contradiction) {
    const invalidImp = onImp.contradiction ? onImp : offImp;
    const validImp = onImp.contradiction ? offImp : onImp;
    const links = invalidImp.conflicts.flatMap((c) => [
      ...findLinks(invalidImp.resolved, c, true),
      ...findLinks(invalidImp.resolved, c ^ 1, false),
    ]);
    return {
      type: 'implication-contradiction',
      paths: [[cell], invalidImp.conflicts.map((c) => c >>> 1), ...links],
      score: validImp.resolved.size - links.length * scoreLengthMult,
      difficultyM: links.length,
      applyTo: (state) => applyToState(state, onImp, offImp),
    };
  }

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
  if (bestTarget === null) {
    return null;
  }

  const links = [
    ...findLinks(onImp.resolved, bestTarget, true),
    ...findLinks(offImp.resolved, bestTarget, true),
  ];
  return {
    type: 'implication-regardless',
    paths: [[cell], [bestTarget >>> 1], ...links],
    score: total - bestDepth * scoreLengthMult,
    difficultyM: links.length,
    applyTo: (state) => applyToState(state, onImp, offImp),
  };
}

export const implications = ({
  implicationFinder = perlRegexp,
  maxComplexity = Number.POSITIVE_INFINITY,
  baseDifficulty = 1,
  tedium = 1,
} = {}) => (rules) => {
  const auxRules = {
    rules: rules.map(({ raw, cellIndices }) => ({
      cellIndices,
      solve: implicationFinder(raw),
    })),
    cellRuleLookup: makeCellRuleLookup(rules),
  };

  return function* (state, { hint, sharedState }) {
    const implications = buildImplications(auxRules, state);

    const cellStates = new Map();
    for (let cell = 0; cell < state.board.length; ++cell) {
      if (state.board[cell] === UNKNOWN) {
        cellStates.set(cell, {
          onImp: beginImplications(cell, ON),
          offImp: beginImplications(cell, OFF),
        });
      }
    }

    let bestHint = null;
    for (let complexity = 1; complexity <= maxComplexity; ++complexity) {
      let active = false;
      for (const [cell, { onImp, offImp }] of cellStates) {
        if (complexity > 1) {
          // resolveImplications solves as much as possible given A => B implications,
          // but cannot account for (A && B && ...) => Z. addImplications fills this void.
          // This effectively acts as a breadth-first search of all possible games where
          // only a single "guess" is required to make progress. If multiple guesses are
          // required, the 'fork' solver is necessary.
          if (!onImp.dead) {
            addImplications(onImp, auxRules, state);
          }
          if (!offImp.dead) {
            addImplications(offImp, auxRules, state);
          }
          if (onImp.dead && offImp.dead) {
            continue;
          }
        }
        active = true;
        if (!onImp.dead && !onImp.contradiction) {
          resolveImplications(implications, onImp);
        }
        if (!offImp.dead && !offImp.contradiction) {
          resolveImplications(implications, offImp);
        }
        if (onImp.contradiction && offImp.contradiction) {
          throw new InvalidGameError('no possible state', cell);
        }
        if (hint) {
          const h = buildHint(cell, onImp, offImp, state.board.length);
          if (h && (!bestHint || h.score > bestHint.score)) {
            bestHint = h;
          }
        } else {
          applyToState(state, onImp, offImp);
        }
      }
      if (!active || bestHint || state.changed) {
        break;
      }
    }
    if (bestHint) {
      bestHint.applyTo(state);
      yield { hint: {
        type: bestHint.type,
        paths: bestHint.paths,
        difficulty: bestHint.difficultyM * baseDifficulty,
        tedium,
      } };
      return;
    }
    if (!state.changed) {
      const impacts = new Map();
      for (const [cell, { onImp, offImp }] of cellStates) {
        impacts.set(cell, { on: onImp.resolved.size, off: offImp.resolved.size });
      }
      sharedState.set('impacts', impacts);
    }
  };
};
