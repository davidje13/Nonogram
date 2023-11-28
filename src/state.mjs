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
