const { UNKNOWN } = require('./constants');

module.exports = {
  makeState({ w, h }) {
    return new Uint8Array(w * h).fill(UNKNOWN);
  },

  cloneState(state) {
    return new Uint8Array(state);
  },

  extract(state, rule) {
    const output = new Uint8Array(rule.cellIndices.length);
    rule.cellIndices.forEach((index, n) => (output[n] = state[index]));
    return output;
  },

  amend(state, rule, update) {
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
  },
};
