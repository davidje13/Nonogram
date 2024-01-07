import { debounce } from '../src/util/debounce.mjs';
import { extractRules } from '../src/game.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { compressRules, decompressRules } from '../src/export/rules.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GamePlayer } from './GamePlayer.mjs';
import { StateStore } from './StateStore.mjs';
import { el, makeButton } from './dom.mjs';
import { Editor } from './Editor.mjs';

const root = el('div');
document.body.append(root);

const player = new GamePlayer({
  cellSize: 23,
  border: 1,
  ruleChecker: perlRegexp,
  hinter: new LiveSolver(),
});

const playerTitle = el('h2', {}, ['']);
let playerID = null;
const stateStore = new StateStore();

const debouncedSave = debounce(() => {
  if (playerID) {
    stateStore.save(playerID, player.getGrid());
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
      stateStore.save(playerID, player.getGrid());
      playerID = null;
    }
    if (!compressedRules) {
      player.setRules({ rows: [], cols: [] });
      return;
    }
    const rules = decompressRules(compressedRules);

    player.setRules(rules);
    const grid = stateStore.load(compressedRules);
    if (grid) {
      player.setGrid(grid);
    } else {
      player.clear();
    }
    playerID = compressedRules;
  }
}

window.addEventListener('hashchange', checkHash);

const editor = new Editor({ width: 5, height: 5, cellWidth: 23, cellHeight: 23 });
editor.addEventListener('play', (e) => {
  window.location.href = `#${new URLSearchParams({ name: 'New game', rules: e.detail.rules })}`;
});

const gameList = el('div', { 'class': 'game-list' });
const currentGames = new Set();

function addGame(compressedRules, name) {
  if (currentGames.has(compressedRules)) {
    return;
  }
  currentGames.add(compressedRules);

  gameList.append(el('a', {
    'class': 'row',
    href: `#${new URLSearchParams({ name, rules: compressedRules })}`,
  }, [
    new GridPreview(decompressRules(compressedRules)).canvas,
    el('div', { 'class': 'label' }, [name])
  ]));
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

root.append(
  editor.container,
  playerTitle,
  player.container,
  el('div', { 'class': 'options' }, [
    makeButton('hint', () => player.hint()),
  ]),
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

checkHash();
