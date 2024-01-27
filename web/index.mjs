import { debounce } from '../src/util/debounce.mjs';
import { extractRules } from '../src/game.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { compressRules, decompressRules } from '../src/export/rules.mjs';
import { compressImage, decompressImage } from '../src/export/image.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GamePlayer } from './GamePlayer.mjs';
import { STATE_DONE, STATE_STARTED, STATE_UNSTARTED, StateStore } from './StateStore.mjs';
import { el, makeButton } from './dom.mjs';
import { Router } from './Router.mjs';
import { EditorPage } from './EditorPage.mjs';
import { ON } from '../src/constants.mjs';
import { readCSV } from '../src/data/csv.mjs';

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
const playerHold = el('div', { 'class': 'center' }, [player.container]);
const playerDOM = makePage(
  playerHold,
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
    editor.validation,
    makeButton('play', () => router.go({
      name: 'New game',
      rules: compressRules(editor.getRules()),
      editor: compressImage(editor.getGrid()),
    })),
    makeButton('copy', async (e) => {
      const btn = e.currentTarget;
      try {
        await navigator.clipboard.writeText(compressRules(editor.getRules()));
        btn.textContent = '\u2713';
        setTimeout(() => {
          btn.textContent = 'copy';
        }, 2000);
      } catch (e) {
        console.warn(e);
      }
    }),
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
      window.requestIdleCallback(() => {
        if (!game.loaded) {
          return;
        }
        if (state === STATE_DONE) {
          game.preview.setImage(grid, true);
        } else if (grid?.data.includes(ON)) {
          game.preview.setImage(grid, false);
        } else {
          game.preview.setRules(decompressRules(compressedRules));
        }
      }, { timeout: 1000 });
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

  for (const item of readCSV(content)) {
    const compressedRules = item.get('rules');
    const name = item.get('name') ?? `#${item.get('row')}`;
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

async function handleComplete() {
  playerHold.classList.add('celebrate');
  player.clearHints();
  player.setReadOnly(true);
  // wait a moment so user is not thrown by a sudden prompt
  await new Promise((resolve) => setTimeout(resolve, 1000));
  try {
    await stateStore.persist();
  } catch (e) {
    console.warn(e);
  }
}

const router = new Router(document.body, [
  ({ rules: compressedRules, name, editor }) => {
    if (!compressedRules) {
      return null;
    }
    const rules = decompressRules(compressedRules);

    player.setRules(rules);
    if (editor) {
      player.clear();
      playerBack.textContent = 'back to editor';
      playerBackTarget = { editor };
    } else {
      const { grid } = stateStore.load(compressedRules);
      if (grid) {
        player.setGrid(grid);
      } else {
        player.clear();
      }
      playerID = compressedRules;
      playerBack.textContent = 'back to list';
      playerBackTarget = {};
    }
    player.setReadOnly(player.isComplete());
    player.addEventListener('complete', handleComplete);

    const title = name ?? 'Nonogram';
    playerTitle.textContent = title;

    return {
      element: playerDOM,
      title,
      unmount: () => {
        player.removeEventListener('complete', handleComplete);
        playerHold.classList.remove('celebrate');
        debouncedSave.immediate();
        playerID = null;
      },
    };
  },
  ({ editor: compressedBitmap }) => {
    if (compressedBitmap === undefined) {
      return null;
    }

    if (compressedBitmap) {
      try {
        editor.setGrid(decompressImage(compressedBitmap));
      } catch (e) {
        console.warn(e);
        editor.clear();
      }
    } else {
      editor.clear();
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
  { name: 'cool beans', rules: 'R-kI6X6AI5rM1zkUbCHBrGkMqHk8vUbI5BQHSEjstl5PQ6' }, // Jaws poster
  { name: 'dice', rules: 'R_9TaWbQJuBWBkFAgtNLXRr4IKBBBwAgkUCVBrw' }, // davidje13 CC BY-SA
  { name: 'football', rules: 'RSJH58Z7Dnyl9tWtZGp7r8XqjLwdrazUm-812Xl5kSoFuEelf7b7FW0LhH2lo-VloqQ' }, // https://en.wikipedia.org/wiki/Nonogram
  { name: 'genuine coconut', rules: 'R_-vr-f3vm3ePu9H6APsD9gfw_v9_fizbnfLu7_c_rfZ_-N_EfxL8v19c' },
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
