import { UNKNOWN, OFF, ON } from '../../../constants.mjs';
import { InvalidGameError } from '../../errors.mjs';

const SYMBOLS = [];
SYMBOLS[UNKNOWN] = '_';
SYMBOLS[OFF]     = ' ';
SYMBOLS[ON]      = 'a';

const OPTIONAL_GAP = '([ _]*)';
const GAP = '([ _]+)';

/**
 * The regexp solver is intentionally inferior to the perlRegexp solver, and represents
 * a simpler mental model for solving games (which can be used to infer difficulty).
 *
 * It can solve many games, but occasionally needs more advanced help.
 */
export const regExp = (rule) => {
  const parts = [OPTIONAL_GAP];
  for (const v of rule) {
    parts.push(`([_a]{${v}})`, GAP);
  }
  parts.pop();
  parts.push(OPTIONAL_GAP);
  const regF = new RegExp('^' + parts.join('') + '$');
  parts.reverse();
  const regR = new RegExp('^' + parts.join('') + '$');
  const count = parts.length;

  return (boardLine) => {
    const symbols = Array.from(boardLine).map((v) => SYMBOLS[v]);
    const targetF = symbols.join('');
    symbols.reverse();
    const targetR = symbols.join('');
    const matchF = regF.exec(targetF);
    const matchR = regR.exec(targetR);
    if (!matchF || !matchR) {
      throw new InvalidGameError(`no match when checking '${targetF}' (${regF}) & '${targetR}' (${regR})`);
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
        boardLine[i] = v;
      }
      pF = endF;
      pR = endR;
    }
  };
};
