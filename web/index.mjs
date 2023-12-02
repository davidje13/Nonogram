import { UNKNOWN } from '../src/constants.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { solver } from '../src/solver/solver.mjs';
import { implications } from '../src/solver/methods/implications.mjs';
import { fork } from '../src/solver/methods/fork.mjs';
import { isolatedRules } from '../src/solver/methods/isolated-rules.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { LiveSolver } from '../src/LiveSolver.mjs';

const root = document.createElement('div');
document.body.append(root);

const info = document.createElement('div');
const definition = document.createElement('div');

// TODO: customisable size
const w = 20;
const h = 20;

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

const board = new Uint8Array(w * h).fill(0);
const boxes = [];
const liveSolver = new LiveSolver(fastSolver, {
  nextFrameFn: (fn) => requestAnimationFrame(fn),
});

liveSolver.addEventListener('begin', () => {
  info.textContent = 'Checking game\u2026';
  for (const box of boxes) {
    box.classList.remove('ambiguous');
  }
});

liveSolver.addEventListener('complete', ({ detail }) => {
  if (!detail.error) {
    info.textContent = 'Game is valid.';
  } else if (detail.error instanceof AmbiguousError) {
    for (let i = 0; i < detail.board.length; ++i) {
      if (detail.board[i] === UNKNOWN) {
        boxes[i].classList.add('ambiguous');
      }
    }
    info.textContent = 'Game is ambiguous.';
  } else {
    console.error(detail.error);
    info.textContent = 'Error checking game.';
  }
});


function onChange() {
  const rules = rulesForImage({ width: w, height: h, data: board });
  definition.textContent = JSON.stringify(rules);
  liveSolver.update(compileGame(rules));
}

for (let y = 0; y < h; ++y) {
  for (let x = 0; x < w; ++x) {
    const box = document.createElement('input');
    box.setAttribute('type', 'checkbox');
    const i = y * w + x;
    box.addEventListener('change', (e) => {
      board[i] = e.currentTarget.checked ? 1 : 0;
      onChange();
    });
    boxes.push(box);
    root.append(box);
  }
  root.append(document.createElement('br'));
}
root.append(info, definition);
onChange();
