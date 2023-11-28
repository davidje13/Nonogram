import { OFF, ON } from '../../../constants.mjs';

/**
 * The trivial solver is intentionally inferior to the regexp solver, and represents a
 * very simple mental model for solving games (which can be used to infer difficulty)
 *
 * It is unable to solve many games alone, but the lines it applies to are the easiest
 * to solve. It must be combined with more complex solvers to fill in the rest of the
 * solution.
 */
export const trivial = (rule) => {
  let len = 0;
  for (const v of rule) {
    len += v + 1;
  }
  if (rule.length) {
    len -= 1;
  }
  return (substate) => {
    if (len === 0) {
      substate.fill(OFF);
      return;
    }
    if (len === substate.length) {
      let pos = 0;
      for (const v of rule) {
        for (let i = 0; i < v; ++ i) {
          substate[pos++] = ON;
        }
        substate[pos++] = OFF;
      }
      return;
    }
  };
};
