import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { debounce } from '../src/util/debounce.mjs';
import { compileGame, rulesForImage, extractRules } from '../src/game.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { compressImage, decompressImage } from '../src/export/image.mjs';
import { compressRules, decompressRules } from '../src/export/rules.mjs';
import { Resizer } from './Resizer.mjs';
import { GridView } from './GridView.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GamePlayer } from './GamePlayer.mjs';

const root = document.createElement('div');
document.body.append(root);

const player = new GamePlayer({
  cellSize: 23,
  border: 1,
  ruleChecker: perlRegexp,
  hinter: new LiveSolver(),
});

const playerTitle = document.createElement('h2');
playerTitle.textContent = '';
let playerID = null;

function save(id, grid) {
  try {
    window.localStorage.setItem(`game-${id}`, compressImage(grid));
  } catch (e) {
    console.warn('failed to save', e);
  }
}

function load(id) {
  try {
    const data = window.localStorage.getItem(`game-${id}`);
    if (data) {
      return decompressImage(data);
    }
  } catch (e) {
    console.warn('failed to load', e);
  }
  return null;
}

const debouncedSave = debounce(() => {
  if (playerID) {
    save(playerID, player.getGrid());
  }
}, 500);

player.addEventListener('change', debouncedSave);
window.addEventListener('blur', debouncedSave.immediate);
window.addEventListener('visibilitychange', debouncedSave.immediate);
window.addEventListener('beforeunload', debouncedSave.immediate, { passive: true });

function checkHash() {
  const params = new URLSearchParams(window.location.hash.substring(1));
  const name = params.get('name') || 'Nonogram';
  playerTitle.textContent = name;

  const compressedRules = params.get('rules');
  if (compressedRules !== playerID) {
    debouncedSave.cancel();
    if (playerID) {
      save(playerID, player.getGrid());
      playerID = null;
    }
    if (!compressedRules) {
      player.setRules({ rows: [], cols: [] });
      return;
    }
    const rules = decompressRules(compressedRules);

    player.setRules(rules);
    const grid = load(compressedRules);
    if (grid) {
      player.setGrid(grid);
    } else {
      player.clear();
    }
    playerID = compressedRules;
  }
}

window.addEventListener('hashchange', checkHash);

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
    const cells = [];
    for (let i = 0; i < detail.board.length; ++i) {
      if (detail.board[i] === UNKNOWN) {
        cells.push(i);
      }
    }
    editorView.mark('cells', cells);
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
  definition.textContent = compressRules(rules);
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
    const rules = compressRules(rulesForImage(editorView.getGrid()));
    window.location.href = `#${new URLSearchParams({ name: 'New game', rules })}`;
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
const currentGames = new Set();

function addGame(compressedRules, name) {
  if (currentGames.has(compressedRules)) {
    return;
  }
  currentGames.add(compressedRules);

  const row = document.createElement('a');
  row.className = 'row';
  row.setAttribute('href', `#${new URLSearchParams({ name, rules: compressedRules })}`);
  const label = document.createElement('div');
  label.className = 'label';
  label.textContent = name;
  const preview = new GridPreview(decompressRules(compressedRules));
  row.append(preview.canvas, label);
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
      addGame(compressRules(extractRules(definition)), definition.name || definition.description || file.name);
    } catch (e) {
      console.error(e);
    }
  }
});

const playOptions = document.createElement('div');
playOptions.className = 'options';
playOptions.append(
  makeButton('hint', () => player.hint()),
);

root.append(
  editor,
  playerTitle,
  player.container,
  playOptions,
  gameList,
);

const games = [
  { name: 'dice', rules: 'R_9TaWbQJuBWBkFAgtNLXRr4IKBBBwAgkUCVBrw' }, // davidje13 CC BY-SA
  { name: 'football', rules: 'RSJH58Z7Dnyl9tWtZGp7r8XqjLwdrazUm-812Xl5kSoFuEelf7b7FW0LhH2lo-VloqQ' }, // https://en.wikipedia.org/wiki/Nonogram
  { name: 'hilbert', rules: 'R__rcyADYw0jrckeeN0rWA63G63LAdK3pygdbkHHDYAHaIu0TAA44aDrcoHpw' }, // Third order Hilbert Curve
  { name: 'lcd5', rules: 'R-pDX5Py6dUnVJ0WT9fnoZdDl0OXk3Pa8AM6MmA0VQ1c6udXOrnVz0QPcgB2QDwA' }, // davidje13 CC BY-SA
  { name: 'spiral', rules: 'R_-bo6xsGkYCWAwAMASgWGsbIai5Pm6OouDULASwGQEwAMAlAwVY2Tpo' }, // davidje13 CC BY-SA
  { name: 'star', rules: 'R_9KPH-_z-v1-v5_38fGkNNx-v1_P_8_r9fj5rA' }, // davidje13 CC BY-SA
  { name: 'yin-yang', rules: 'RSJCnpOj4dR9R9n1Pc_J-z_F_Z_I_wP6X4-nCnpOKxkmwvufgV8Cvk_S_a_3_z_P4-nA' }, // davidje13 CC BY-SA
];
games.sort((a, b) => a.name > b.name ? 1 : -1);
for (const { name, rules } of games) {
  addGame(rules, name);
}

editorChanged();
checkHash();
