export function makeCellRuleLookup(rules) {
  const cellRuleLookup = new Map();
  for (let i = 0; i < rules.length; ++i) {
    const { cellIndices } = rules[i];
    for (let j = 0; j < cellIndices.length; ++j) {
      let l = cellRuleLookup.get(cellIndices[j]);
      if (!l) {
        l = [];
        cellRuleLookup.set(cellIndices[j], l);
      }
      l.push({ ruleIndex: i, cellIndex: j });
    }
  }
  return cellRuleLookup;
}
