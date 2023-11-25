import { UNKNOWN, ON, OFF } from '../constants.mjs';
import { cloneSubstate, extract } from '../state.mjs';

const IMPLICATIONS_CACHE = Symbol();

function buildImplications(rules, state, ctx) {
  const implications = [];
  for (let i = 0; i < state.length * 2; ++i) {
    implications.push([]);
  }
  const cacheMap = ctx.getStateCache(state, IMPLICATIONS_CACHE);
  for (const rule of rules) {
    const initial = extract(state, rule);
    let cached = cacheMap.get(rule);
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
      cacheMap.set(rule, cached);
      for (let i = 0; i < initial.length; ++i) {
        if (initial[i] !== UNKNOWN) {
          continue;
        }

        const substateOn = cloneSubstate(initial);
        const substateOff = cloneSubstate(initial);
        substateOn[i] = ON;
        substateOff[i] = OFF;
        ctx.solveSingleRule(rule, substateOn);
        ctx.solveSingleRule(rule, substateOff);

        const impOff = [];
        const impOn = [];
        for (let j = 0; j < initial.length; ++j) {
          if (initial[j] === UNKNOWN && j !== i) {
            if (substateOn[j] !== UNKNOWN) {
              impOn.push(rule.cellIndices[j] * 2 + (substateOn[j] === ON ? 1 : 0));
            }
            if (substateOff[j] !== UNKNOWN) {
              impOff.push(rule.cellIndices[j] * 2 + (substateOff[j] === ON ? 1 : 0));
            }
          }
        }
        cached.results.push({ cell: rule.cellIndices[i], impOn, impOff });
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

export default (depth = 10) => ({
  multiRule: true,
  run(rules, state, ctx, sharedState) {
    const implications = buildImplications(rules, state, ctx);
    let changed = false;
    const impacts = new Map();
    for (let cell = 0; cell < state.length; ++cell) {
      if (state[cell] !== UNKNOWN) {
        continue;
      }
      const onImp = resolveImplications(implications, cell, ON, depth);
      const offImp = resolveImplications(implications, cell, OFF, depth);
      if (onImp !== null && offImp !== null) {
        for (const p of onImp) {
          if (offImp.has(p)) {
            state[p >>> 1] = (p & 1) ? ON : OFF;
            changed = true;
          }
        }
        impacts.set(cell, { on: onImp.size, off: offImp.size });
      } else if (onImp !== null || offImp !== null) {
        for (const p of (onImp ?? offImp)) {
          state[p >>> 1] = (p & 1) ? ON : OFF;
        }
        changed = true;
      } else {
        throw new Error('impossible game');
      }
    }
    sharedState.impacts = impacts;
    return changed;
  },
});
