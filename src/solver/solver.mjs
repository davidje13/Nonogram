import { UNKNOWN, UNKNOWABLE } from '../constants.mjs';
import { StuckError } from './errors.mjs';
import { SolverState } from './SolverState.mjs';

export const solver = (...methods) => (rules) => {
  const auxMethods = methods.map((method) => method(rules));

  function* solve(state) {
    steps: while (state.board.includes(UNKNOWN)) {
      const ctx = { solve, sharedState: new Map() };
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

  const solveSteps = (board) => {
    const coveredCells = new Set();
    for (const { cellIndices } of rules) {
      cellIndices.forEach((i) => coveredCells.add(i));
    }
    for (let i = 0; i < board.length; ++i) {
      if (board[i] === UNKNOWN && !coveredCells.has(i)) {
        board[i] = UNKNOWABLE;
      }
    }
    return solve(new SolverState(board));
  };

  return {
    solveSteps,
    solve: (board) => {
      for (const _ of solveSteps(board)) {}
    },
  };
};
