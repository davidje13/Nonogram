import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { LiveSolver } from '../src/LiveSolver.mjs';
import { GridView } from './GridView.mjs';

const root = document.createElement('div');
document.body.append(root);

const info = document.createElement('div');
const definition = document.createElement('pre');

const liveSolver = new LiveSolver('/src/live-solver-worker.mjs');

const editor = new GridView({
  width: 20,
  height: 20,
  cellWidth: 23,
  cellHeight: 23,
  fill: OFF,
  getChange: (v, alt) => alt ? null : (v === ON ? OFF : ON),
});

liveSolver.addEventListener('begin', () => {
  info.textContent = 'Checking game\u2026';
  editor.clearMarked();
});

liveSolver.addEventListener('complete', ({ detail }) => {
  if (!detail.error) {
    info.textContent = 'Game is valid.';
  } else if (detail.error instanceof AmbiguousError) {
    for (let i = 0; i < detail.board.length; ++i) {
      if (detail.board[i] === UNKNOWN) {
        editor.setMarked(i, 0, true);
      }
    }
    info.textContent = 'Game is ambiguous.';
  } else {
    console.error(detail.error);
    info.textContent = 'Error checking game.';
  }
});

editor.addEventListener('change', ({ detail }) => {
  const rules = rulesForImage({ width: detail.width, height: detail.height, data: detail.values });
  definition.textContent = JSON.stringify(rules);
  liveSolver.update(compileGame(rules));
});

function makeButton(text, fn) {
  const btn = document.createElement('button');
  btn.setAttribute('type', 'button');
  btn.textContent = text;
  btn.addEventListener('click', fn);
  return btn;
}

const options = document.createElement('div');
options.append(
  makeButton('grow right', () => editor.resize({ width: editor.getSize().width + 1, fill: OFF })),
  makeButton('grow bottom', () => editor.resize({ height: editor.getSize().height + 1, fill: OFF })),
  makeButton('grow left', () => editor.resize({ width: editor.getSize().width + 1, dx: 1, fill: OFF })),
  makeButton('grow top', () => editor.resize({ height: editor.getSize().height + 1, dy: 1, fill: OFF })),
  makeButton('shrink right', () => editor.resize({ width: editor.getSize().width - 1, fill: OFF })),
  makeButton('shrink bottom', () => editor.resize({ height: editor.getSize().height - 1, fill: OFF })),
  makeButton('shrink left', () => editor.resize({ width: editor.getSize().width - 1, dx: -1, fill: OFF })),
  makeButton('shrink top', () => editor.resize({ height: editor.getSize().height - 1, dy: -1, fill: OFF })),
);
root.append(editor.canvas, options, info, definition);

//const display = new GridView({
//  width: 20, // TODO: customisable size
//  height: 20,
//  cellWidth: 15,
//  cellHeight: 15,
//  fill: UNKNOWN,
//  getChange: (v, alt) => alt ? (v === OFF ? UNKNOWN : OFF) : (v === OFF ? null : v === ON ? UNKNOWN : ON),
//});
//root.append(display.canvas);
