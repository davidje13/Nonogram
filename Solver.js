const { UNKNOWN, ON, OFF } = require('./constants.js');
const { cloneState, extract, amend } = require('./state.js');

module.exports = class Solver {
  constructor(solvers) {
    this.solvers = solvers.map((solver) => ({ solver, symbol: Symbol() }));
  }

  solve1D(rule, substate) {
    for (const { solver, symbol } of this.solvers) {
      if (!substate.includes(UNKNOWN)) {
        break;
      }
      if (!rule[symbol]) {
        rule[symbol] = solver.compile(rule.raw);
      }
      const compiled = rule[symbol];
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

  solveGuess(rules, state, trialPos) {
    const stateOn = cloneState(state);
    const stateOff = cloneState(state);
    stateOn[trialPos] = ON;
    stateOff[trialPos] = OFF;

    // The best way to test the rules is to run the perl-regexp solver,
    // so as long as we have perl-regexp loaded, we know that all unknown
    // cells at this point could be either ON or OFF and there is no need
    // to check the states.

    //let okOn = true;
    //let okOff = true;
    //for (const rule of rules) {
    //  if (rule.cellIndices.includes(trialPos)) {
    //    if (!testRule(rule, extract(stateOn, rule))) {
    //      okOn = false;
    //    }
    //    if (!testRule(rule, extract(stateOff, rule))) {
    //      okOff = false;
    //    }
    //  }
    //}
    //if (!okOn && !okOff) {
    //  throw new Error('failed to find possible guess for cell!');
    //}
    //if (!okOn) {
    //  state[trialPos] = OFF;
    //  return;
    //}
    //if (!okOff) {
    //  state[trialPos] = ON;
    //  return;
    //}

    // run both in parallel until one has a conflict (throws an exception)
    let succeededOn = false;
    let succeededOff = false;
    while (true) {
      if (!succeededOn) {
        try {
          this.solveStepOrGuess(rules, stateOn);
        } catch (e) {
          state.set(stateOff);
          return;
        }
        succeededOn = !stateOn.includes(UNKNOWN);
      }
      if (!succeededOff) {
        try {
          this.solveStepOrGuess(rules, stateOff);
        } catch (e) {
          state.set(stateOn);
          return;
        }
        succeededOff = !stateOn.includes(UNKNOWN);
      }
      if (succeededOn && succeededOff) {
        throw new Error('game is not fully defined!');
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
};
