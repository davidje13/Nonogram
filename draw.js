const { UNKNOWN, OFF, ON } = require('./constants');

const SYMBOLS = [];
SYMBOLS[UNKNOWN] = '-';
SYMBOLS[OFF]     = ' ';
SYMBOLS[ON]      = '#';

module.exports = {
  drawGameState({ w, h, rows, cols }, state) {
    const top = Math.max(...cols.map((clues) => clues.length));
    const left = w;
    const padX = 3;

    const output = [];
    for (let i = 0; i < top + h; ++ i) {
      output.push(new Array(left + w * padX).fill(' '));
    }
    for (let y = 0; y < h; ++ y) {
      for (let x = 0; x < w; ++ x) {
        const c = SYMBOLS[state[y * w + x]];
        for (let i = 0; i < Math.max(1, padX - 1); ++ i) {
          output[top + y][left + x * padX + i] = c;
        }
      }
      let pos = left;
      const clueStrs = rows[y].map(String);
      for (const v of clueStrs) {
        pos -= (v.length + 1);
      }
      for (const v of clueStrs) {
        for (let i = 0; i < v.length; ++ i) {
          output[top + y][pos + i] = v[i];
        }
        pos += (v.length + 1);
      }
    }
    for (let x = 0; x < w; ++ x) {
      let pos = top - cols[x].length;
      for (const clue of cols[x]) {
        const v = String(clue);
        for (let i = 0; i < v.length; ++ i) {
          output[pos][left + (x + 1) * padX - 1 - v.length + i] = v[i];
        }
        ++ pos;
      }
    }
    for (const ln of output) {
      process.stdout.write(ln.join('') + '\n');
    }
  },
};
