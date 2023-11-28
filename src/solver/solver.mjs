import { UNKNOWN } from '../constants.mjs';
import { StuckError } from './errors.mjs';
import { SolverState } from './SolverState.mjs';

export const solver = (...methods) => (rules) => {
  const auxMethods = methods.map((method) => method(rules));

  function* solve(state) {
    steps: while (state.board.includes(UNKNOWN)) {
      const ctx = { solve, sharedState: {} };
      for (const method of auxMethods) {
        state.changed = false;
        yield* method(state, ctx);
        if (state.changed) {
          yield;
          continue steps;
        }
      }
      throw new StuckError();
    }
  };

  return {
    solveSteps: (board) => solve(new SolverState(board)),
    solve: (board) => {
      for (const _ of solve(new SolverState(board))) {}
    },
  };
};
