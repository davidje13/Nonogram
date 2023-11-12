import { UNKNOWN, OFF, ON } from './constants.mjs';

const SYMBOLS = [];
SYMBOLS[UNKNOWN] = '-';
SYMBOLS[OFF]     = ' ';
SYMBOLS[ON]      = '#';

export function drawGameState({ w, h, rows, cols }, state) {
  const top = Math.max(1, ...cols.map((rule) => (rule?.length || 1)));
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
    const rule = rows[y];
    if (!rule) {
      output[top + y][left - 2] = '?';
    } else if (!rule.length) {
      output[top + y][left - 2] = '0';
    } else {
      let pos = left;
      const clueStrs = rule.map(String);
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
  }
  for (let x = 0; x < w; ++ x) {
    const rule = cols[x];
    const xx = left + (x + 1) * padX - 1;
    if (!rule) {
      output[top - 1][xx - 1] = '?';
    } else if (!rule.length) {
      output[top - 1][xx - 1] = '0';
    } else {
      let pos = top - rule.length;
      for (const clue of rule) {
        const v = String(clue);
        for (let i = 0; i < v.length; ++ i) {
          output[pos][xx - v.length + i] = v[i];
        }
        ++ pos;
      }
    }
  }
  for (const ln of output) {
    process.stdout.write(ln.join('') + '\n');
  }
}
