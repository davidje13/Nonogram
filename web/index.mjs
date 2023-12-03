import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { solver } from '../src/solver/solver.mjs';
import { implications } from '../src/solver/methods/implications.mjs';
import { fork } from '../src/solver/methods/fork.mjs';
import { isolatedRules } from '../src/solver/methods/isolated-rules.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { LiveSolver } from '../src/LiveSolver.mjs';
import { GridView } from './GridView.mjs';

const root = document.createElement('div');
document.body.append(root);

const info = document.createElement('div');
const definition = document.createElement('pre');

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

const liveSolver = new LiveSolver(fastSolver, {
  nextFrameFn: (fn) => requestAnimationFrame(fn),
});

const display = new GridView({
  width: 20, // TODO: customisable size
  height: 20,
  cellWidth: 23,
  cellHeight: 23,
  initial: OFF,
  getChange: (v, alt) => alt ? null : (v === ON ? OFF : ON),
});

liveSolver.addEventListener('begin', () => {
  info.textContent = 'Checking game\u2026';
  display.clearMarked();
});

liveSolver.addEventListener('complete', ({ detail }) => {
  if (!detail.error) {
    info.textContent = 'Game is valid.';
  } else if (detail.error instanceof AmbiguousError) {
    for (let i = 0; i < detail.board.length; ++i) {
      if (detail.board[i] === UNKNOWN) {
        display.setMarked(i, 0, true);
      }
    }
    info.textContent = 'Game is ambiguous.';
  } else {
    console.error(detail.error);
    info.textContent = 'Error checking game.';
  }
});

display.addEventListener('change', ({ detail }) => {
  const rules = rulesForImage({ width: detail.width, height: detail.height, data: detail.values });
  definition.textContent = JSON.stringify(rules);
  liveSolver.update(compileGame(rules));
});

root.append(display.canvas, info, definition);

//const display2 = new GridView({
//  width: 20, // TODO: customisable size
//  height: 20,
//  cellWidth: 15,
//  cellHeight: 15,
//  initial: UNKNOWN,
//  getChange: (v, alt) => alt ? (v === OFF ? UNKNOWN : OFF) : (v === OFF ? null : v === ON ? UNKNOWN : ON),
//});
//root.append(display2.canvas);
