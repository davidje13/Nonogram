import { OFF, ON } from './constants.mjs';

function isCellOn(cell) {
  return cell && cell !== ' ';
}

function stringToImage(str) {
  if (!Array.isArray(str)) {
    str = str.split('\n');
  }
  const width = str[0].length;
  const height = str.length;
  const data = new Uint8Array(width * height);
  for (let y = 0; y < height; ++y) {
    if (str[y].length !== width) {
      throw new Error('Malformed image in game data');
    }
    for (let x = 0; x < width; ++x) {
      data[y * width + x] = isCellOn(str[y][x]) ? ON : OFF;
    }
  }
  return { width, height, data };
}

export function rulesForImage({ width, height, data }) {
  const rows = [];
  const cols = [];

  for (let y = 0; y < height; ++ y) {
    const rule = [];
    let start = -1;
    for (let x = 0; x < width; ++ x) {
      if (data[y * width + x] === ON) {
        if (start === -1) {
          start = x;
        }
      } else if (start !== -1) {
        rule.push(x - start);
        start = -1;
      }
    }
    if (start !== -1) {
      rule.push(width - start);
    }
    rows.push(rule);
  }

  for (let x = 0; x < width; ++ x) {
    const rule = [];
    let start = -1;
    for (let y = 0; y < height; ++ y) {
      if (data[y * width + x] === ON) {
        if (start === -1) {
          start = y;
        }
      } else if (start !== -1) {
        rule.push(y - start);
        start = -1;
      }
    }
    if (start !== -1) {
      rule.push(height - start);
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

export function extractRules({ rows, cols, image }) {
  if (rows && cols) {
    testRules(rows, cols);
    return { rows, cols };
  }
  if (image) {
    return rulesForImage(stringToImage(image));
  }
  throw new Error('No game data found');
}

export function compileGame({ rows, cols }) {
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
}
