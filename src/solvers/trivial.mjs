import { OFF, ON } from '../constants.mjs';

export default {
  compile(rule) {
    let len = 0;
    for (const v of rule) {
      len += v + 1;
    }
    if (rule.length) {
      len -= 1;
    }
    return { raw: rule, len };
  },
  run({ len, raw }, substate) {
    if (len === 0) {
      substate.fill(OFF);
      return;
    }
    if (len === substate.length) {
      let pos = 0;
      for (const v of raw) {
        for (let i = 0; i < v; ++ i) {
          substate[pos++] = ON;
        }
        substate[pos++] = OFF;
      }
      return;
    }
  },
};
