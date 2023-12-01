import { UNKNOWN, OFF, ON, UNKNOWABLE } from '../../constants.mjs';

const SYMBOLS = [];
SYMBOLS[UNKNOWN]    = '-';
SYMBOLS[OFF]        = ' ';
SYMBOLS[ON]         = '#';
SYMBOLS[UNKNOWABLE] = '?';

const RSYMBOLS = Object.fromEntries(SYMBOLS.map((v, k) => [v, k]));

export function boardLineFromString(str) {
  const l = str.length;
  const boardLine = new Uint8Array(l);
  for (let i = 0; i < l; ++i) {
    boardLine[i] = RSYMBOLS[str[i]];
  }
  return boardLine;
}

export function boardToString({ w, h }, board) {
  const output = [];
  for (let i = 0; i < h; ++ i) {
    output.push(new Array(w).fill(' '));
  }
  for (let y = 0; y < h; ++ y) {
    for (let x = 0; x < w; ++ x) {
      output[y][x] = SYMBOLS[board[y * w + x]];
    }
  }
  return output.map((ln) => ln.join('')).join('\n');
}

export function boardLineToString(boardLine) {
  return boardToString({ w: boardLine.length, h: 1 }, boardLine);
}
