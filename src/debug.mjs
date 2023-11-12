import { UNKNOWN, OFF, ON } from './constants.mjs';

const SYMBOLS = [];
SYMBOLS[UNKNOWN] = '-';
SYMBOLS[OFF]     = ' ';
SYMBOLS[ON]      = '#';

const RSYMBOLS = Object.fromEntries(SYMBOLS.map((v, k) => [v, k]));

export function stateFromString(image) {
  if (!Array.isArray(image)) {
    image = image.split('\n');
  }
  const w = image[0].length;
  const h = image.length;
  const state = new Uint8Array(w * h);
  for (let y = 0; y < h; ++y) {
    for (let x = 0; x < w; ++x) {
      state[y * w + x] = RSYMBOLS[image[y][x]];
    }
  }
  return state;
}

export function stateToString({ w, h }, state) {
  const output = [];
  for (let i = 0; i < h; ++ i) {
    output.push(new Array(w).fill(' '));
  }
  for (let y = 0; y < h; ++ y) {
    for (let x = 0; x < w; ++ x) {
      output[y][x] = SYMBOLS[state[y * w + x]];
    }
  }
  return output.map((ln) => ln.join('')).join('\n');
}

export function stateToString1D(state) {
  return stateToString({ w: state.length, h: 1 }, state);
}
