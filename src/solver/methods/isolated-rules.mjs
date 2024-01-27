import { UNKNOWN } from '../../constants.mjs';

export const isolatedRules = (perRuleMethod, { baseDifficulty = 1, tedium = 1 } = {}) => (rules) => {
  const auxRules = rules.map(({ raw, cellIndices }) => ({
    boardLine: new Uint8Array(cellIndices.length),
    cellIndices,
    method: perRuleMethod(raw),
    difficulty: Math.max(1, raw.length) * baseDifficulty,
    count: raw.length,
  }));

  return function* (state, { hint }) {
    let best = 0;
    let bestRule = null;
    for (const rule of auxRules) {
      state.readBoardLine(rule.boardLine, rule.cellIndices);
      if (rule.boardLine.includes(UNKNOWN)) {
        rule.method(rule.boardLine);
        if (hint) {
          const counts = state.countBoardLine(rule.boardLine, rule.cellIndices);
          const score = (counts.on * 5 + counts.off) / (rule.count + 1);
          if (score > best) {
            best = score;
            bestRule = rule;
          }
        } else {
          state.writeBoardLine(rule.boardLine, rule.cellIndices);
        }
      }
    }
    if (hint && bestRule) {
      state.writeBoardLine(bestRule.boardLine, bestRule.cellIndices);
      yield {
        hint: {
          type: 'rule',
          paths: [bestRule.cellIndices],
          difficulty: bestRule.difficulty,
          tedium,
        },
      };
    }
  };
};
