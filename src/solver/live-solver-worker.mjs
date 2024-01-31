import { setImmediate } from '../util/setImmediate.mjs';
import { UNKNOWN } from '../constants.mjs';
import { fastSolver, thoroughSolver, hintSolver } from './standard-solvers.mjs';
import { Judge } from './Judge.mjs';

let active = null;
let board = null;
let iterator = null;
let nextStep = null;

const MODES = new Map([
  ['solve', { solver: fastSolver, hint: false }],
  ['check', { solver: thoroughSolver, hint: false }],
  ['judge', { solver: hintSolver, hint: true }],
  ['hint', { solver: hintSolver, hint: true }],
]);

addEventListener('message', ({ data: { game, current, id, mode } }) => {
  const m = MODES.get(mode);
  if (!m) {
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
  iterator = m.solver(game.rules).solveSteps(board, m.hint);
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
      case 'check':
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
