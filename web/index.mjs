import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { Resizer } from './Resizer.mjs';
import { GridView } from './GridView.mjs';
import { GamePlayer } from './GamePlayer.mjs';

const root = document.createElement('div');
document.body.append(root);

const info = document.createElement('div');
const definition = document.createElement('pre');
definition.className = 'definition';

const liveSolver = new LiveSolver();

const editor = new GridView({
  width: 5,
  height: 5,
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
  const rules = rulesForImage({
    width: detail.width,
    height: detail.height,
    data: detail.values,
  });
  player.setRules(rules);
  definition.textContent = JSON.stringify(rules);
  liveSolver.solveInBackground(compileGame(rules));
});

function makeButton(text, fn) {
  const btn = document.createElement('button');
  btn.setAttribute('type', 'button');
  btn.textContent = text;
  btn.addEventListener('click', fn);
  return btn;
}

const options = document.createElement('div');
options.className = 'options';
options.append(
  makeButton('clear', () => editor.fill(OFF)),
);

const editorResizer = new Resizer(editor.canvas, {
  getCurrentSize: () => editor.getSize(),
  xScale: editor.getTotalCellSize().width,
  yScale: editor.getTotalCellSize().height,
  xMin: 1,
  yMin: 1,
});

editorResizer.addEventListener('change', ({ detail }) => editor.resize({
  width: detail.width,
  height: detail.height,
  dx: detail.dx,
  dy: detail.dy,
  fill: OFF,
}));

const player = new GamePlayer({ cellSize: 23, border: 1, ruleChecker: perlRegexp });
root.append(options, editorResizer.container, info, player.container, definition);
