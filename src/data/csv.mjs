export function* readCSV(content) {
  let headers = null;
  const curLine = [];
  const curCell = [];
  let addingCell = false;
  let curCellS = -1;
  let curCellE = 0;
  let rowNum = 0;
  function accum(v, lit) {
    if (lit || (v !== ' ' && v !== '\t')) {
      curCellE = curCell.length + 1;
      if (curCellS === -1) {
        curCellS = curCell.length;
      }
    }
    curCell.push(v);
  }
  function commitCell() {
    if (curCellS === -1) {
      if (addingCell) {
        curLine.push('');
      }
    } else {
      curLine.push(curCell.slice(curCellS, curCellE).join(''));
    }
    curCell.length = 0;
    curCellS = -1;
    curCellE = 0;
    addingCell = false;
  }
  function *commitLine() {
    commitCell();
    if (!curLine.length) {
      return;
    }
    if (!headers) {
      headers = curLine.map((v) => v.toLowerCase());
    } else {
      const entity = new Map();
      entity.set('row', rowNum);
      for (let j = 0; j < headers.length; ++j) {
        entity.set(headers[j], curLine[j]);
      }
      yield entity;
      ++rowNum;
    }
    curLine.length = 0;
  }
  let state = '';
  for (let i = 0, n = content.length; i < n; ++i) {
    const c = content.charAt(i);
    if (c === '\n' && (state === '' || state === '#')) {
      yield* commitLine();
      state = '';
    } else if (state === '#') {
      // empty
    } else if (c === '\\' && i + 1 < n) {
      accum(content.charAt(i + 1), true);
      ++i;
    } else if (state === '') {
      if (c === ',') {
        addingCell = true;
        commitCell();
        addingCell = true;
      } else if (c === "'" || c === '"') {
        addingCell = true;
        state = c;
      } else if (c === '#') {
        state = '#';
      } else {
        accum(c, false);
      }
    } else {
      if (c === state) {
        state = '';
      } else {
        accum(c, true);
      }
    }
  }
  yield* commitLine();
}

export function writeCSVCell(v) {
  if (v === null || v === undefined || v === '') {
    return '';
  }
  if (typeof v === 'number' || typeof v === 'boolean') {
    return JSON.stringify(v);
  }
  if (typeof v !== 'string') {
    return '<invalid>';
  }
  if (/^[a-zA-Z0-9\-_+=!@£$%^&*()\[\]{};:|`~<>./? ]*$/.test(v) && v[0] !== ' ' && v[v.length - 1] !== ' ') {
    return v;
  }
  if (!v.includes('"')) {
    return `"${v.replaceAll(/\\/g, '\\\\').replaceAll(/,/g, '<comma>')}"`;
  }
  if (!v.includes("'")) {
    return `'${v.replaceAll(/\\/g, '\\\\').replaceAll(/,/g, '<comma>')}'`;
  }
  return `"${v.replaceAll(/\\/g, '\\\\').replaceAll(/,/g, '\\,').replaceAll(/"/g, `\\"`)}"`;
}
