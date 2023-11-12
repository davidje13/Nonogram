import { UNKNOWN, ON, OFF } from './constants.mjs';
import { cloneState, extract, amend } from './state.mjs';
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
          if (!stateOn.includes(UNKNOWN)) {
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
          if (!stateOff.includes(UNKNOWN)) {
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

  solveStepOrGuess(rules, state) {
    if (!this.solveStep(rules, state)) {
      this.solveGuess(rules, state, state.indexOf(UNKNOWN));
    }
  }

  solve(rules, state) {
    while (state.includes(UNKNOWN)) {
      this.solveStepOrGuess(rules, state);
    }
  }
}
