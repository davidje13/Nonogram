import { makeBoard } from './board.mjs';
import { solver } from './solver/solver.mjs';
import { implications } from './solver/methods/implications.mjs';
import { fork } from './solver/methods/fork.mjs';
import { isolatedRules } from './solver/methods/isolated-rules.mjs';
import { perlRegexp } from './solver/methods/isolated-rules/perl-regexp.mjs';
import { setImmediate } from './setImmediate.mjs';

let activeID = null;
let board = null;
let iterator = null;
let nextStep = null;

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

addEventListener('message', ({ data: { game, id } }) => {
  activeID = id;
  board = makeBoard(game);
  iterator = fastSolver(game.rules).solveSteps(board);
  if (nextStep === null) {
    step();
  }
});

function step() {
  nextStep = null;
  const timeout = Date.now() + 20;
  try {
    while (!iterator.next().done) {
      if (Date.now() >= timeout) {
        nextStep = setImmediate(step);
        return;
      }
    }
    postMessage({ id: activeID, board, error: null });
  } catch (error) {
    postMessage({ id: activeID, board, error: { message: error.message, ...error } });
  }
}
