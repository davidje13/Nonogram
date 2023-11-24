import { UNKNOWN, ON, OFF } from '../constants.mjs';
import { cloneState, cloneSubstate, extract } from '../state.mjs';
import { AmbiguousError } from '../AmbiguousError.mjs';

function judgeImportance(rules, state, position, ctx) {
  let solvedOn = 0;
  let solvedOff = 0;
  for (const rule of rules) {
    const rulePos = rule.cellIndices.indexOf(position);
    if (rulePos === -1) {
      continue;
    }
    const substateOn = extract(state, rule);
    const initialUnknown = countUnknown(substateOn);
    const substateOff = cloneSubstate(substateOn);
    substateOn[rulePos] = ON;
    substateOff[rulePos] = OFF;
    ctx.solveSingleRule(rule, substateOn);
    ctx.solveSingleRule(rule, substateOff);
    solvedOn += initialUnknown - countUnknown(substateOn);
    solvedOff += initialUnknown - countUnknown(substateOff);
  }
  //return Math.min(solvedOn, solvedOff);
  return Math.log(solvedOn) + Math.log(solvedOff);
}

function countUnknown(substate) {
  let count = 0;
  for (const v of substate) {
    if (v === UNKNOWN) {
      ++count;
    }
  }
  return count;
}

function pickGuessSpot(rules, state, ctx, sharedState) {
  let bestI = 0;
  let bestN = -1;

  if (sharedState.impacts) {
    // another rule already did the hard work for us
    for (const [i, { on, off }] of sharedState.impacts.entries()) {
      const n = Math.log(on) + Math.log(off);
      if (n > bestN) {
        bestI = i;
        bestN = n;
      }
    }
  } else {
    // shallow breadth-first search to find a good candidate location for making a guess
    for (let i = 0; i < state.length; ++i) {
      if (state[i] === UNKNOWN) {
        const n = judgeImportance(rules, state, i, ctx);
        if (n > bestN) {
          bestI = i;
          bestN = n;
        }
      }
    }
  }
  return bestI;
}

export default {
  multiRule: true,
  run(rules, state, ctx, sharedState) {
    const trialPos = pickGuessSpot(rules, state, ctx, sharedState);
    //process.stderr.write(`Guessing at position ${trialPos}\n`);

    const stateOn = cloneState(state);
    const stateOff = cloneState(state);
    stateOn[trialPos] = ON;
    stateOff[trialPos] = OFF;

    // run both in parallel until one has a conflict (throws an exception)
    let succeededOn = false;
    let succeededOff = false;
    while (true) {
      if (!succeededOn) {
        try {
          if (!ctx.solveStep(rules, stateOn)) {
            return false;
          }
          if (ctx.check(rules, stateOn)) {
            succeededOn = true;
          }
        } catch (e) {
          if (e instanceof AmbiguousError) {
            throw e;
          }
          state.set(stateOff);
          return true;
        }
      }
      if (!succeededOff) {
        try {
          if (!ctx.solveStep(rules, stateOff)) {
            return false;
          }
          if (ctx.check(rules, stateOff)) {
            succeededOff = true;
          }
        } catch (e) {
          if (e instanceof AmbiguousError) {
            throw e;
          }
          state.set(stateOn);
          return true;
        }
      }
      if (succeededOn && succeededOff) {
        throw new AmbiguousError([stateOn, stateOff]);
      }
    }
  },
};
