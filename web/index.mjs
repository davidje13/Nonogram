import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame, rulesForImage, extractRules } from '../src/game.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { Resizer } from './Resizer.mjs';
import { GridView } from './GridView.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GamePlayer } from './GamePlayer.mjs';

const root = document.createElement('div');
document.body.append(root);

const player = new GamePlayer({ cellSize: 23, border: 1, ruleChecker: perlRegexp });

const playerTitle = document.createElement('h2');
playerTitle.textContent = '';

const info = document.createElement('div');
const definition = document.createElement('pre');
definition.className = 'definition';

const liveSolver = new LiveSolver();

const editor = document.createElement('div');
editor.className = 'editor';
const editorTitle = document.createElement('h2');
editorTitle.textContent = 'Editor';

const editorView = new GridView({
  width: 5,
  height: 5,
  cellWidth: 23,
  cellHeight: 23,
  fill: OFF,
  getChange: (v, alt) => alt ? null : (v === ON ? OFF : ON),
});

liveSolver.addEventListener('begin', () => {
  info.textContent = 'Checking game\u2026';
  editorView.clearMarked();
});

liveSolver.addEventListener('complete', ({ detail }) => {
  if (!detail.error) {
    info.textContent = 'Game is valid.';
  } else if (detail.error instanceof AmbiguousError) {
    for (let i = 0; i < detail.board.length; ++i) {
      if (detail.board[i] === UNKNOWN) {
        editorView.setMarked(i, 0, true);
      }
    }
    info.textContent = 'Game is ambiguous.';
  } else {
    console.error(detail.error);
    info.textContent = 'Error checking game.';
  }
});

const preview = new GridPreview();

const editorChanged = () => {
  const rules = rulesForImage(editorView.getGrid());
  preview.setRules(rules);
  definition.textContent = JSON.stringify(rules);
  liveSolver.solveInBackground(compileGame(rules));
};

editorView.addEventListener('change', editorChanged);

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
  makeButton('clear', () => editorView.fill(OFF)),
  makeButton('play', () => {
    const rules = rulesForImage(editorView.getGrid());
    playerTitle.textContent = 'New game';
    player.setRules(rules);
    player.clear();
  }),
);

const editorResizer = new Resizer(editorView.canvas, {
  getCurrentSize: () => editorView.getGrid(),
  xScale: editorView.getTotalCellSize().width,
  yScale: editorView.getTotalCellSize().height,
  xMin: 1,
  yMin: 1,
});

editorResizer.addEventListener('change', ({ detail }) => editorView.resize({
  width: detail.width,
  height: detail.height,
  dx: detail.dx,
  dy: detail.dy,
  fill: OFF,
}));

editor.append(editorTitle, options, editorResizer.container, info, preview.canvas, definition);

const gameList = document.createElement('div');
gameList.className = 'game-list';

function addGame(rules, name) {
  const row = document.createElement('a');
  row.className = 'row';
  row.setAttribute('href', '#');
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = name;
  const preview = new GridPreview(rules);
  row.append(preview.canvas, label);
  row.addEventListener('click', (e) => {
    e.preventDefault();
    playerTitle.textContent = name;
    player.setRules(rules);
    player.clear();
  });
  gameList.append(row);
}

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', async (e) => {
  e.preventDefault();
  const files = [...e.dataTransfer.items]
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile());

  for (const file of files) {
    try {
      const definition = JSON.parse(await file.text());
      addGame(extractRules(definition), definition.name || definition.description || file.name);
    } catch (e) {
      console.error(e);
    }
  }
});

root.append(editor, playerTitle, player.container, gameList);

editorChanged();

(async () => {
  for (const game of ['football', 'hilbert', 'lcd5', 'yin-yang']) {
      try {
      const r = await fetch(`games/${game}.json`);
      const definition = await r.json();
      addGame(extractRules(definition), definition.name || definition.description || game);
    } catch (e) {
      console.error(e);
    }
  }
})();
