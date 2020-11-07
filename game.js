function isCellOn(cell) {
  return cell && cell !== ' ';
}

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
      if (isCellOn(image[y][x])) {
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
      if (isCellOn(image[y][x])) {
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

function testRules1D(rules, max) {
  if (!Array.isArray(rules)) {
    throw new Error(`Rules should be an array, got ${rules}`);
  }
  let total = 0;
  for (const rule of rules) {
    if (rule === null) {
      total = Number.POSITIVE_INFINITY;
      continue;
    }
    let ruleTotal = 0;
    if (!Array.isArray(rule)) {
      throw new Error(`Each rule should be an array, got ${rule}`);
    }
    for (const v of rule) {
      if (typeof v !== 'number' || Math.round(v) !== v) {
        throw new Error(`Each rule part should be an integer, got ${v}`);
      }
      if (v <= 0) {
        throw new Error(`All rules must be positive integers, got ${v}`);
      }
      ruleTotal += v + 1;
      total += v;
    }
    if (ruleTotal - 1 > max) {
      throw new Error('Solution to rule does not fit on board');
    }
  }
  return total;
}

function testRules(rows, cols) {
  const dotsR = testRules1D(rows, cols.length);
  const dotsC = testRules1D(cols, rows.length);
  if (
    dotsR !== Number.POSITIVE_INFINITY &&
    dotsC !== Number.POSITIVE_INFINITY &&
    dotsR !== dotsC
  ) {
    throw new Error(`Board mismatch; rows define ${dotsR} cells but columns define ${dotsC}`);
  }
}

module.exports = {
  compileGame(input) {
    let rows;
    let cols;
    if (input.rows && input.cols) {
      rows = input.rows;
      cols = input.cols;
      testRules(rows, cols);
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
      if (!cols[x]) {
        continue;
      }
      const cellIndices = [];
      for (let y = 0; y < h; ++ y) {
        cellIndices.push(y * w + x);
      }
      rules.push({ raw: cols[x], cellIndices });
    }
    for (let y = 0; y < h; ++ y) {
      if (!rows[y]) {
        continue;
      }
      const cellIndices = [];
      for (let x = 0; x < w; ++ x) {
        cellIndices.push(y * w + x);
      }
      rules.push({ raw: rows[y], cellIndices });
    }

    return { w, h, rows, cols, rules };
  },
};
