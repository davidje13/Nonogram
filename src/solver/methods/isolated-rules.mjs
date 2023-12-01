import { UNKNOWN } from '../../constants.mjs';

export const isolatedRules = (perRuleMethod) => (rules) => {
  const auxRules = rules.map(({ raw, cellIndices }) => ({
    substate: new Uint8Array(cellIndices.length),
    cellIndices,
    method: perRuleMethod(raw),
  }));

  return function* (state) {
    for (const { substate, cellIndices, method } of auxRules) {
      state.readSubstate(substate, cellIndices);
      if (substate.includes(UNKNOWN)) {
        method(substate);
        for (let n = 0; n < cellIndices.length; ++n) {
          state.setCell(cellIndices[n], substate[n]);
        }
      }
    }
  };
};
