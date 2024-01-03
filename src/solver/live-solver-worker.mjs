import { setImmediate } from '../util/setImmediate.mjs';
import { UNKNOWN } from '../constants.mjs';
import { solver } from './solver.mjs';
import { implications } from './methods/implications.mjs';
import { fork } from './methods/fork.mjs';
import { isolatedRules } from './methods/isolated-rules.mjs';
import { trivial } from './methods/isolated-rules/trivial.mjs';
import { caps } from './methods/isolated-rules/caps.mjs';
import { regExp } from './methods/isolated-rules/regexp.mjs';
import { perlRegexp } from './methods/isolated-rules/perl-regexp.mjs';

let activeID = null;
let isHint = false;
let board = null;
let iterator = null;
let nextStep = null;

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

const hintSolver = solver(
  isolatedRules(trivial),
  isolatedRules(regExp),
  isolatedRules(perlRegexp),
  implications({ maxDepth: 2 }),
  implications({ maxDepth: 3 }),
  implications(),
  fork({ parallel: false, maxDepth: 5, fastSolve: false }),
  fork({ parallel: false }),
);

addEventListener('message', ({ data: { game, current, id, hint = false } }) => {
  activeID = id;
  isHint = hint;
  board = new Uint8Array(game.w * game.h);
  if (current) {
    board.set(current);
  } else {
    board.fill(UNKNOWN);
  }
  const solver = hint ? hintSolver : fastSolver;
  iterator = solver(game.rules).solveSteps(board, hint);
  if (nextStep === null) {
    step();
  }
});

function step() {
  nextStep = null;
  const timeout = Date.now() + 20;
  try {
    if (isHint) {
      while (Date.now() < timeout) {
        const i = iterator.next();
        if (i.value?.hint || i.done) {
          postMessage({ id: activeID, board, hint: i.value?.hint ?? null, error: null });
          return;
        }
      }
    } else {
      while (Date.now() < timeout) {
        if (iterator.next().done) {
          postMessage({ id: activeID, board, error: null });
          return;
        }
      }
    }
    nextStep = setImmediate(step);
  } catch (error) {
    postMessage({ id: activeID, board, error: { message: error.message, ...error } });
  }
}
