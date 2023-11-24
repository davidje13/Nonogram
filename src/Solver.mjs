import { UNKNOWN } from './constants.mjs';
import { extract, amend } from './state.mjs';
import { StuckError } from './StuckError.mjs';
import solverPerlRegexp from './solvers/perl-regexp.mjs';

const CHECK = Symbol();

export class Solver {
  constructor(solvers, checker = solverPerlRegexp) {
    this._singleRuleSolvers = solvers
      .filter(({ multiRule }) => !multiRule)
      .map((solver) => ({ solver, symbol: Symbol() }));
    this._multiRuleSolvers = solvers
      .filter(({ multiRule }) => multiRule)
      .map((solver) => ({ solver }));
    this._checker = checker;
  }

  solveSingleRule(rule, substate) {
    for (const { solver, symbol } of this._singleRuleSolvers) {
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

  checkSingleRule(rule, substate) {
    let compiled = rule[CHECK];
    if (!compiled) {
      rule[CHECK] = compiled = this._checker.compile(rule.raw);
    }
    this._checker.run(compiled, substate);
  }

  check(rules, state) {
    for (const rule of rules) {
      this.checkSingleRule(rule, extract(state, rule));
    }
    return this.isComplete(state);
  }

  isComplete(state) {
    return !state.includes(UNKNOWN);
  }

  solveStep(rules, state) {
    let changed = false;
    for (const rule of rules) {
      const substate = extract(state, rule);
      this.solveSingleRule(rule, substate);
      if (amend(state, rule, substate)) {
        changed = true;
      }
    }
    if (changed) {
      return true;
    }
    const sharedState = {};
    for (const { solver } of this._multiRuleSolvers) {
      if (solver.run(rules, state, this, sharedState)) {
        return true;
      }
    }
    return false;
  }

  solve(rules, state) {
    while (!this.isComplete(state)) {
      if (!this.solveStep(rules, state)) {
        throw new StuckError();
      }
    }
  }
}
