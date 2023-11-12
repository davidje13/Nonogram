import { UNKNOWN, OFF, ON } from './constants.mjs';

const SYMBOLS = [];
SYMBOLS[UNKNOWN] = '-';
SYMBOLS[OFF]     = ' ';
SYMBOLS[ON]      = '#';

export function makeState({ w, h }) {
  return new Uint8Array(w * h).fill(UNKNOWN);
}

export function cloneState(state) {
  return new Uint8Array(state);
}

export function extract(state, rule) {
  const output = new Uint8Array(rule.cellIndices.length);
  rule.cellIndices.forEach((index, n) => (output[n] = state[index]));
  return output;
}

export function amend(state, rule, update) {
  let change = false;
  rule.cellIndices.forEach((index, n) => {
    const old = state[index];
    const val = update[n];
    if (old !== UNKNOWN && old !== val) {
      throw new Error(`contradiction at index ${index}`);
    }
    if (old !== val) {
      state[index] = val;
      change = true;
    }
  });
  return change;
}

export function toString({ w, h }, state) {
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
