module.exports = {
  compileGame({ rows, cols }) {
    const w = cols.length;
    const h = rows.length;

    const rules = [];
    for (let x = 0; x < w; ++ x) {
      const cellIndices = [];
      for (let y = 0; y < h; ++ y) {
        cellIndices.push(y * w + x);
      }
      rules.push({ raw: cols[x], cellIndices });
    }
    for (let y = 0; y < h; ++ y) {
      const cellIndices = [];
      for (let x = 0; x < w; ++ x) {
        cellIndices.push(y * w + x);
      }
      rules.push({ raw: rows[y], cellIndices });
    }

    return { w, h, rows, cols, rules };
  },
};
