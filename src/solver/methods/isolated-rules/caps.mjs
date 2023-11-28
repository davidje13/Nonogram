import { OFF, ON, UNKNOWN } from '../../../constants.mjs';
import { InvalidGameError } from '../../errors.mjs';

function extractBlocks(substate) {
  const found = [];
  let started = -1;
  let anchorL = false;
  for (let i = 0; i < substate.length; ++ i) {
    const v = substate[i];
    if (v === ON) {
      if (started === -1) {
        anchorL = (i === 0) || (substate[i - 1] === OFF);
        started = i;
      }
    } else if (started !== -1) {
      const len = i - started;
      const anchorR = (v === OFF);
      found.push({ pos: started, len, capped: anchorL && anchorR });
      started = -1;
    }
  }
  if (started !== -1) {
    const len = substate.length - started;
    const anchorR = true;
    found.push({ pos: started, len, capped: anchorL && anchorR });
  }
  return found;
}

/**
 * The caps solver is untentionally inferior to the regexp solver, and represents a
 * very simple mental model for solving games (which can be used to infer difficulty)
 *
 * It is unable to solve any games alone, but the situations it applies to are obvious
 * to a human and represent a low difficulty.
 */
export const caps = (rule) => (substate) => {
  const found = extractBlocks(substate);
  const remaining = [...rule];

  remaining.sort((a, b) => (a - b)); // sort smallest first
  found.sort((a, b) => (b.len - a.len)); // sort largest first

  for (const block of found) {
    if (block.capped) {
      const pos = remaining.indexOf(block.len);
      if (pos === -1) {
        throw new InvalidGameError('incorrect block length found');
      }
      remaining.splice(pos, 1);
    }
  }
  for (const block of found) {
    if (block.capped) {
      continue;
    }
    if (!remaining.find((v) => (v > block.len))) {
      // nothing longer; block must be capped here
      const l = block.pos - 1;
      const r = block.pos + block.len;
      if (l >= 0) {
        substate[l] = OFF;
      }
      if (r < substate.length) {
        substate[r] = OFF;
      }
      const pos = remaining.indexOf(block.len);
      if (pos === -1) {
        throw new InvalidGameError('incorrect block length found');
      }
      remaining.splice(pos, 1);
    }
  }

  if (!remaining.length) {
    // found everything; all unknown items must be blank
    for (let i = 0; i < substate.length; ++i) {
      if (substate[i] === UNKNOWN) {
        substate[i] = OFF;
      }
    }
  }
};
