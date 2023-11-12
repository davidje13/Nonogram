import { UNKNOWN, OFF, ON } from '../constants.mjs';

const SYMBOLS = [];
SYMBOLS[UNKNOWN] = '_';
SYMBOLS[OFF]     = ' ';
SYMBOLS[ON]      = 'a';

const OPTIONAL_GAP = '([ _]*)';
const GAP = '([ _]+)';

export default {
  compile(rule) {
    const parts = [OPTIONAL_GAP];
    for (const v of rule) {
      parts.push(`([_a]{${v}})`, GAP);
    }
    parts.pop();
    parts.push(OPTIONAL_GAP);
    const regF = new RegExp('^' + parts.join('') + '$');
    parts.reverse();
    const regR = new RegExp('^' + parts.join('') + '$');
    return { regF, regR, count: parts.length };
  },
  run({ regF, regR, count }, substate) {
    const symbols = Array.from(substate).map((v) => SYMBOLS[v]);
    const targetF = symbols.join('');
    symbols.reverse();
    const targetR = symbols.join('');
    const matchF = regF.exec(targetF);
    const matchR = regR.exec(targetR);
    if (!matchF || !matchR) {
      throw new Error(`failed to find match when checking '${targetF}' (${regF}) & '${targetR}' (${regR})`);
    }

    let pF = 0;
    let pR = 0;
    for (let i = 0; i < count; ++ i) {
      const lenF = matchF[i + 1].length;
      const lenR = matchR[count - i].length;
      const endF = pF + lenF;
      const endR = pR + lenR;
      const v = (i & 1) ? ON : OFF;
      for (let i = Math.max(pF, pR); i < Math.min(endF, endR); ++ i) {
        substate[i] = v;
      }
      pF = endF;
      pR = endR;
    }
  },
};
