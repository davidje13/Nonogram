import { UNKNOWN } from '../../constants.mjs';

export const isolatedRules = (perRuleMethod) => (rules) => {
  const auxRules = rules.map(({ raw, cellIndices }) => ({
    boardLine: new Uint8Array(cellIndices.length),
    cellIndices,
    method: perRuleMethod(raw),
  }));

  return function* (state) {
    for (const { boardLine, cellIndices, method } of auxRules) {
      state.readBoardLine(boardLine, cellIndices);
      if (boardLine.includes(UNKNOWN)) {
        method(boardLine);
        state.writeBoardLine(boardLine, cellIndices);
      }
    }
  };
};
