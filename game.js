function rulesForImage(image) {
  if (!Array.isArray(image)) {
    image = image.split('\n');
  }
  const w = image[0].length;
  const h = image.length;
  const rows = [];
  const cols = [];

  for (let y = 0; y < h; ++ y) {
    if (image[y].length !== w) {
      throw new Error('Malformed image in game data');
    }
    const rule = [];
    let start = -1;
    for (let x = 0; x < w; ++ x) {
      if (image[y][x] !== ' ') {
        if (start === -1) {
          start = x;
        }
      } else if (start !== -1) {
        rule.push(x - start);
        start = -1;
      }
    }
    if (start !== -1) {
      rule.push(w - start);
    }
    rows.push(rule);
  }

  for (let x = 0; x < w; ++ x) {
    const rule = [];
    let start = -1;
    for (let y = 0; y < h; ++ y) {
      if (image[y][x] !== ' ') {
        if (start === -1) {
          start = y;
        }
      } else if (start !== -1) {
        rule.push(y - start);
        start = -1;
      }
    }
    if (start !== -1) {
      rule.push(h - start);
    }
    cols.push(rule);
  }

  return { rows, cols };
}

module.exports = {
  compileGame(input) {
    let rows;
    let cols;
    if (input.rows && input.cols) {
      rows = input.rows;
      cols = input.cols;
    } else if (input.image) {
      const data = rulesForImage(input.image);
      rows = data.rows;
      cols = data.cols;
    } else {
      throw new Error('No game data found');
    }
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
