import { UNKNOWN } from '../src/constants.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { makeBoard } from '../src/board.mjs';
import { solver } from '../src/solver/solver.mjs';
import { AmbiguousError, InvalidGameError } from '../src/solver/errors.mjs';
import { implications } from '../src/solver/methods/implications.mjs';
import { fork } from '../src/solver/methods/fork.mjs';
import { isolatedRules } from '../src/solver/methods/isolated-rules.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';

const root = document.createElement('div');
document.body.append(root);

// TODO: customisable size
const w = 20;
const h = 20;

const board = new Uint8Array(w * h);
board.fill(0);

const info = document.createElement('div');

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

let rules = null;
let game = null;
let solveBoard = null;
let iterator = null;
let iterateFrame = null;

const boxes = [];

function onChange() {
  info.textContent = 'Checking game\u2026';
  for (const box of boxes) {
    box.classList.remove('ambiguous');
  }
  rules = rulesForImage({ width: w, height: h, data: board });
  game = compileGame(rules);
  solveBoard = makeBoard(game);
  iterator = fastSolver(game.rules).solveSteps(solveBoard);
  if (!iterateFrame) {
    iterate();
  }
}

function iterate() {
  const timeout = Date.now() + 20;
  try {
    while (!iterator.next().done) {
      if (Date.now() >= timeout) {
        iterateFrame = requestAnimationFrame(iterate);
        return;
      }
    }
    info.textContent = 'Game is valid.';
    iterateFrame = null;
  } catch (e) {
    iterateFrame = null;
    if (e instanceof AmbiguousError) {
      for (let i = 0; i < solveBoard.length; ++i) {
        if (solveBoard[i] === UNKNOWN) {
          boxes[i].classList.add('ambiguous');
        }
      }
      info.textContent = 'Game is ambiguous.';
    } else if (e instanceof InvalidGameError) {
      info.textContent = 'Game is invalid.';
    } else {
      info.textContent = 'Error checking game.';
    }
  }
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
root.append(info);
onChange();
