import { UNKNOWN, ON, OFF } from './constants.mjs';
import { cloneState, cloneSubstate, extract, amend } from './state.mjs';
import { AmbiguousError } from './AmbiguousError.mjs';
import checker from './solvers/perl-regexp.mjs';

const CHECK = Symbol();

export class Solver {
  constructor(solvers) {
    this.solvers = solvers.map((solver) => ({ solver, symbol: Symbol() }));
  }

  solve1D(rule, substate) {
    for (const { solver, symbol } of this.solvers) {
      if (!substate.includes(UNKNOWN)) {
        break;
      }
      let compiled = rule[symbol];
      if (!compiled) {
        rule[symbol] = compiled = solver.compile(rule.raw);
      }
      solver.run(compiled, substate);
    }
  }

  solveStep(rules, state) {
    let changed = false;
    for (const rule of rules) {
      const substate = extract(state, rule);
      this.solve1D(rule, substate);
      if (amend(state, rule, substate)) {
        changed = true;
      }
    }
    return changed;
  }

  check1D(rule, substate) {
    let compiled = rule[CHECK];
    if (!compiled) {
      rule[CHECK] = compiled = checker.compile(rule.raw);
    }
    checker.run(compiled, substate);
  }

  check(rules, state) {
    for (const rule of rules) {
      this.check1D(rule, extract(state, rule));
    }
  }

  solveGuess(rules, state, trialPos) {
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
          this.solveStepOrGuess(rules, stateOn);
          this.check(rules, stateOn);
          if (this.isComplete(stateOn)) {
            succeededOn = true;
          }
        } catch (e) {
          if (e instanceof AmbiguousError) {
            throw e;
          }
          state.set(stateOff);
          return;
        }
      }
      if (!succeededOff) {
        try {
          this.solveStepOrGuess(rules, stateOff);
          this.check(rules, stateOff);
          if (this.isComplete(stateOff)) {
            succeededOff = true;
          }
        } catch (e) {
          if (e instanceof AmbiguousError) {
            throw e;
          }
          state.set(stateOn);
          return;
        }
      }
      if (succeededOn && succeededOff) {
        throw new AmbiguousError([stateOn, stateOff]);
      }
    }
  }

  judgeImportance(rules, state, position) {
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
      this.solve1D(rule, substateOn);
      this.solve1D(rule, substateOff);
      solvedOn += initialUnknown - countUnknown(substateOn);
      solvedOff += initialUnknown - countUnknown(substateOff);
    }
    //return Math.min(solvedOn, solvedOff);
    return Math.log(solvedOn) + Math.log(solvedOff);
  }

  pickGuessSpot(rules, state) {
    // shallow breadth-first search to find a good candidate location for making a guess
    let bestI = 0;
    let bestN = -1;
    for (let i = 0; i < state.length; ++i) {
      if (state[i] === UNKNOWN) {
        const n = this.judgeImportance(rules, state, i);
        if (n > bestN) {
          bestI = i;
          bestN = n;
        }
      }
    }
    //process.stderr.write(`Guessing at position ${bestI}\n`);
    return bestI;
  }

  isComplete(state) {
    return !state.includes(UNKNOWN);
  }

  solveStepOrGuess(rules, state) {
    if (!this.solveStep(rules, state)) {
      this.solveGuess(rules, state, this.pickGuessSpot(rules, state));
    }
  }

  solve(rules, state) {
    while (!this.isComplete(state)) {
      this.solveStepOrGuess(rules, state);
    }
  }
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
