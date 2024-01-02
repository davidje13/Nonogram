import { setImmediate } from '../util/setImmediate.mjs';
import { UNKNOWN } from '../constants.mjs';
import { solver } from './solver.mjs';
import { implications } from './methods/implications.mjs';
import { fork } from './methods/fork.mjs';
import { isolatedRules } from './methods/isolated-rules.mjs';
import { perlRegexp } from './methods/isolated-rules/perl-regexp.mjs';

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
  board = new Uint8Array(game.w * game.h).fill(UNKNOWN);
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
