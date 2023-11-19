import { UNKNOWN, UNKNOWABLE } from './constants.mjs';

export function makeState({ w, h, rules }) {
  const r = new Uint8Array(w * h).fill(UNKNOWN);
  if (rules) {
    const coveredCells = new Set();
    for (const { cellIndices } of rules) {
      cellIndices.forEach((i) => coveredCells.add(i));
    }
    for (let i = 0; i < w * h; ++i) {
      if (!coveredCells.has(i)) {
        r[i] = UNKNOWABLE;
      }
    }
  }
  return r;
}

export function cloneState(state) {
  return new Uint8Array(state);
}

export function cloneSubstate(substate) {
  return new Uint8Array(substate);
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
