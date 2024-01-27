import { setImmediate } from '../util/setImmediate.mjs';
import { UNKNOWN } from '../constants.mjs';
import { fastSolver, hintSolver } from './standard-solvers.mjs';
import { Judge } from './Judge.mjs';

let active = null;
let board = null;
let iterator = null;
let nextStep = null;

addEventListener('message', ({ data: { game, current, id, mode } }) => {
  if (mode !== 'hint' && mode !== 'solve' && mode !== 'judge') {
    throw new Error(`unknown mode: ${mode}`);
  }
  active = { id, mode };
  board = new Uint8Array(game.w * game.h);
  if (current) {
    board.set(current);
  } else {
    board.fill(UNKNOWN);
  }
  if (active.mode === 'judge') {
    active.judge = new Judge(game.w, game.h);
  }
  const solver = (active.mode === 'solve') ? fastSolver : hintSolver;
  iterator = solver(game.rules).solveSteps(board, active.mode !== 'solve');
  if (nextStep === null) {
    step();
  }
});

function step() {
  nextStep = null;
  const timeout = Date.now() + 20;
  try {
    switch (active.mode) {
      case 'hint':
        while (Date.now() < timeout) {
          const i = iterator.next();
          if (i.value?.hint || i.done) {
            postMessage({ id: active.id, board, hint: i.value?.hint ?? null, error: null });
            return;
          }
        }
        break;
      case 'judge':
        while (Date.now() < timeout) {
          const i = iterator.next();
          active.judge.accumulate(i.value);
          if (i.done) {
            postMessage({ id: active.id, board, judge: { ...active.judge }, error: null });
            return;
          }
        }
        break;
      case 'solve':
        while (Date.now() < timeout) {
          if (iterator.next().done) {
            postMessage({ id: active.id, board, error: null });
            return;
          }
        }
        break;
      default:
        throw new Error('unknown mode');
    }
    nextStep = setImmediate(step);
  } catch (error) {
    postMessage({ id: active.id, board, error: { message: error.message, ...error } });
  }
}
