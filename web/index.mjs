import { debounce } from '../src/util/debounce.mjs';
import { extractRules } from '../src/game.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { compressRules, decompressRules } from '../src/export/rules.mjs';
import { compressImage } from '../src/export/image.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GamePlayer } from './GamePlayer.mjs';
import { STATE_DONE, STATE_STARTED, STATE_UNSTARTED, StateStore } from './StateStore.mjs';
import { el, makeButton } from './dom.mjs';
import { Router } from './Router.mjs';
import { EditorPage } from './EditorPage.mjs';
import { ON } from '../src/constants.mjs';

function makePage(content, title, l, r) {
  return el('div', { 'class': 'page' }, [
    el('nav', {}, [
      el('div', {}, l),
      el('h1', {}, [title]),
      el('div', {}, r),
    ]),
    content,
  ]);
}

const player = new GamePlayer({
  cellSize: 23,
  border: 1,
  ruleChecker: perlRegexp,
  hinter: new LiveSolver(),
});
const playerTitle = el('span');
let playerBackTarget = {};
const playerBack = makeButton('back to list', () => router.go(playerBackTarget));
const playerDOM = makePage(
  el('div', { 'class': 'center' }, [player.container]),
  playerTitle,
  [playerBack],
  [makeButton('hint', () => player.hint())],
);

const editor = new EditorPage({ width: 5, height: 5, cellWidth: 23, cellHeight: 23 });
const editorDOM = makePage(
  el('div', { 'class': 'center' }, [editor.container]),
  'Nonogram editor',
  [
    makeButton('back to list', () => router.go({})),
    makeButton('clear', () => editor.clear()),
  ],
  [
    el('div', { 'class': 'validation' }, [editor.validation]),
    makeButton('play', () => router.go({
      name: 'New game',
      rules: compressRules(editor.getRules()),
      editor: compressImage(editor.getGrid()),
    })),
  ],
);

const gameList = el('div', { 'class': 'game-list' });
const listDOM = makePage(
  gameList,
  'Nonograms',
  [],
  [makeButton('+ new', () => router.go({ editor: '' }))],
);

const currentGames = new Map();
const ITEM_CLASSES = {
  [STATE_DONE]: 'done',
  [STATE_STARTED]: 'started',
  [STATE_UNSTARTED]: 'unstarted',
};

const vis = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const compressedRules = entry.target.dataset['r'];
    const game = currentGames.get(compressedRules);
    if (!game) {
      throw new Error(`no game ${compressedRules}`);
    }
    if (entry.isIntersecting && !game.loaded) {
      const { state, grid } = stateStore.load(compressedRules);
      if (state === STATE_DONE) {
        game.preview.setImage(grid, true);
      } else if (grid?.data.includes(ON)) {
        game.preview.setImage(grid, false);
      } else {
        game.preview.setRules(decompressRules(compressedRules));
      }
      game.item.className = `item ${ITEM_CLASSES[state]}`;
      game.loaded = true;
    }
    if (!entry.isIntersecting && game.loaded) {
      game.preview.clear();
      game.loaded = false;
    }
  }
});
function addGame(compressedRules, name) {
  if (currentGames.has(compressedRules)) {
    return;
  }

  const preview = new GridPreview('preview');
  const item = el('a', {
    'class': 'item',
    href: router.makeLink({ name, rules: compressedRules }),
  }, [preview.container, el('div', { 'class': 'label' }, [name])]);
  item.dataset['r'] = compressedRules;
  currentGames.set(compressedRules, { item, preview, loaded: false });
  gameList.append(item);
  vis.observe(item);
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
    const content = await file.text();
    try {
      readGames(content, ({ compressedRules, name }) => addGame(compressedRules, name || file.name));
    } catch (e) {
      console.error(e);
    }
  }
});

function readGames(content, callback) {
  if (content[0] === '{') {
    const definition = JSON.parse(content);
    callback({
      compressedRules: compressRules(extractRules(definition)),
      name: definition.name || definition.description,
    });
    return;
  }

  const [head, ...lines] = content.split('\n')
    .map((ln) => ln.replace(/#.*/, '').trim())
    .filter((ln) => ln)
    .map((ln) => ln.split(','));
  const headers = head.map((v) => v.toLowerCase());
  const nameIndex = headers.indexOf('name');
  const rulesIndex = headers.indexOf('rules');
  if (rulesIndex === -1) {
    throw new Error('no rules column');
  }
  for (let i = 0; i < lines.length; ++i) {
    const compressedRules = lines[i][rulesIndex];
    const name = nameIndex === -1 ? `#${i}` : lines[i][nameIndex];
    if (compressedRules) {
      callback({ compressedRules, name });
    }
  }
}

let playerID = null;
const stateStore = new StateStore();

const debouncedSave = debounce(() => {
  if (playerID) {
    stateStore.save(
      playerID,
      player.isComplete() ? STATE_DONE
        : player.isStarted() ? STATE_STARTED
        : STATE_UNSTARTED,
      player.getGrid(),
    );
  }
}, 500);

player.addEventListener('change', debouncedSave);
window.addEventListener('blur', debouncedSave.immediate);
window.addEventListener('visibilitychange', debouncedSave.immediate);
window.addEventListener('beforeunload', debouncedSave.immediate, { passive: true });

const router = new Router(document.body, [
  ({ rules: compressedRules, name, editor }) => {
    if (!compressedRules) {
      return null;
    }
    const rules = decompressRules(compressedRules);

    player.setRules(rules);
    const { grid } = stateStore.load(compressedRules);
    if (grid) {
      player.setGrid(grid);
    } else {
      player.clear();
    }
    playerID = compressedRules;

    const title = name ?? 'Nonogram';
    playerTitle.textContent = title;

    if (editor) {
      playerBack.textContent = 'back to editor';
      playerBackTarget = { editor };
    } else {
      playerBack.textContent = 'back to list';
      playerBackTarget = {};
    }

    return {
      element: playerDOM,
      title,
      unmount: () => {
        debouncedSave.immediate();
        playerID = null;
      },
    };
  },
  ({ editor }) => {
    if (editor === undefined) {
      return null;
    }

    return {
      element: editorDOM,
      title: 'Editor',
    };
  },
  () => {
    return {
      element: listDOM,
      title: 'Nonogram',
    };
  },
]);

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
