import { UNKNOWN, ON, OFF } from '../constants.mjs';
import { cloneSubstate, extract } from '../state.mjs';

function getRelevantRules(rules) {
  const max = Math.max(...rules.map((r) => Math.max(...r.cellIndices)));
  const relevantRules = [];
  for (let i = 0; i <= max; ++i) {
    relevantRules.push([]);
  }
  for (const rule of rules) {
    for (const i of rule.cellIndices) {
      relevantRules[i].push(rule);
    }
  }
  return relevantRules;
}

function buildImplications(relevantRules, state, ctx) {
  const implications = new Array(state.length * 2).fill(null);
  for (let cell = 0; cell < state.length; ++cell) {
    if (state[cell] !== UNKNOWN) {
      continue;
    }
    const impOn = [];
    const impOff = [];
    for (const rule of relevantRules[cell] ?? []) {
      const rulePos = rule.cellIndices.indexOf(cell);
      const initial = extract(state, rule);
      initial[rulePos] = ON;
      if (initial.indexOf(UNKNOWN) === -1) {
        continue;
      }
      const substateOn = cloneSubstate(initial);
      const substateOff = cloneSubstate(initial);
      substateOff[rulePos] = OFF;
      ctx.solveSingleRule(rule, substateOn);
      ctx.solveSingleRule(rule, substateOff);
      for (let j = 0; j < rule.cellIndices.length; ++j) {
        if (initial[j] === UNKNOWN) {
          if (substateOn[j] !== UNKNOWN) {
            impOn.push({ cell: rule.cellIndices[j], is: substateOn[j] });
          }
          if (substateOff[j] !== UNKNOWN) {
            impOff.push({ cell: rule.cellIndices[j], is: substateOff[j] });
          }
        }
      }
    }
    implications[cell * 2] = impOff;
    implications[cell * 2 + 1] = impOn;
  }
  return implications;
}

function resolveImplications(implications, seed, depth) {
  const resolved = new Map([[seed.cell, seed.is]]);
  let cur = [seed];
  for (let d = 0; d < depth && cur.length; ++d) {
    let next = [];
    for (const v of cur) {
      for (const n of implications[v.cell * 2 + (v.is === ON ? 1 : 0)]) {
        const existing = resolved.get(n.cell);
        if (existing === undefined) {
          next.push(n);
          resolved.set(n.cell, n.is);
        } else if (existing !== n.is) {
          return null; // found a contradiction
        }
      }
    }
    cur = next;
  }
  return resolved;
}

export default (depth = 10) => ({
  multiRule: true,
  compile(rules) {
    return getRelevantRules(rules);
  },
  run(relevantRules, state, ctx, sharedState) {
    const implications = buildImplications(relevantRules, state, ctx);
    let changed = false;
    const impacts = new Map();
    for (let cell = 0; cell < state.length; ++cell) {
      if (state[cell] !== UNKNOWN) {
        continue;
      }
      const onImp = resolveImplications(implications, { cell, is: ON }, depth);
      const offImp = resolveImplications(implications, { cell, is: OFF }, depth);
      if ((onImp === null) !== (offImp === null)) {
        for (const [cell, is] of (onImp ?? offImp)) {
          state[cell] = is;
        }
        changed = true;
      } else if (onImp !== null) {
        impacts.set(cell, { on: onImp.size, off: offImp.size });
      } else {
        throw new Error('impossible game');
      }
    }
    sharedState.impacts = impacts;
    return changed;
  },
});
