import { UNKNOWN } from '../../constants.mjs';

export const isolatedRules = (...perRuleMethods) => (rules) => {
  const auxRules = rules.map(({ raw, cellIndices }) => ({
    substate: new Uint8Array(cellIndices.length),
    cellIndices,
    methods: perRuleMethods.map((method) => method(raw)),
  }));

  return function* (state) {
    for (const { substate, cellIndices, methods } of auxRules) {
      state.readSubstate(substate, cellIndices);
      if (substate.includes(UNKNOWN)) {
        for (const method of methods) {
          method(substate);
        }
        for (let n = 0; n < cellIndices.length; ++n) {
          state.setCell(cellIndices[n], substate[n]);
        }
      }
    }
  };
};
