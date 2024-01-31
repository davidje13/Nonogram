import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame } from '../src/game.mjs';
import { GridView } from './GridView.mjs';
import { el } from './dom.mjs';

const STATE_INCOMPLETE = 0;
const STATE_INVALID = 1;
const STATE_COMPLETE = 2;

class RulesView extends EventTarget {
  constructor({ align, ruleChecker = null }) {
    super();
    this.container = el('div', { 'class': `rules align-${align}` });
    this._ruleChecker = ruleChecker;
    this._rules = [];

    this._onClick = this._on.bind(this, 'click');
    this._onDblClick = this._on.bind(this, 'dblclick');
    this.container.addEventListener('click', this._onClick, { passive: false });
    this.container.addEventListener('dblclick', this._onDblClick, { passive: false });
  }

  destroy() {
    this.container.removeEventListener('click', this._onClick);
    this.container.removeEventListener('dblclick', this._onDblClick);
  }

  _on(type, e) {
    e.preventDefault();
    const ruleIndex = Number(e.target.dataset['rule'] ?? '-1');
    if (ruleIndex === -1) {
      return;
    }
    const { state } = this._rules[ruleIndex];
    const numberIndex = Number(e.target.dataset['index'] ?? '0');
    this.dispatchEvent(new CustomEvent(type, { detail: { raw: e, ruleIndex, numberIndex, state } }));
  }

  setRules(rules) {
    for (const { dom } of this._rules) {
      this.container.removeChild(dom);
    }
    this._rules.length = 0;
    for (const rule of rules) {
      const els = el('div');
      els.dataset['rule'] = this._rules.length;
      let total = 0;
      let checker = null;
      if (rule) {
        for (const v of rule.length > 0 ? rule : [0]) {
          const item = el('div', {}, [String(v)]);
          item.dataset['rule'] = this._rules.length;
          item.dataset['index'] = els.length;
          els.append(item);
          total += v;
        }
        checker = this._ruleChecker?.(rule);
      } else {
        const item = el('div', {}, ['?']);
        item.dataset['rule'] = this._rules.length;
        item.dataset['index'] = 0;
        els.append(item);
      }
      this.container.append(els);
      this._rules.push({ dom: els, total, checker, state: STATE_INCOMPLETE });
    }
  }

  isComplete() {
    return this._rules.every((r) => r.state === STATE_COMPLETE);
  }

  check(i, boardLine) {
    const r = this._rules[i];
    if (!r || !r.checker) {
      r.state = STATE_COMPLETE;
      return;
    }
    const solution = new Uint8Array(boardLine);
    try {
      r.checker(solution);
      let n = 0;
      for (const cell of boardLine) {
        if (cell === ON) {
          ++n;
        }
      }
      const done = n === r.total;
      r.state = done ? STATE_COMPLETE : STATE_INCOMPLETE;
      r.dom.className = (done ? 'done' : '');
    } catch {
      r.state = STATE_INVALID;
      r.dom.className = 'error';
    }
  }
}

export class GamePlayer extends EventTarget {
  constructor({ cellSize, border, ruleChecker = null, hinter = null }) {
    super();
    this._width = 0;
    this._height = 0;
    this._rules = { rows: [], cols: [] };
    this._complete = false;
    this._hinter = hinter;
    this._hintLevel = 0;
    this._hinting = false;
    this._readonly = false;
    const outerBorder = border;
    this._rulesT = new RulesView({ align: 'bottom', ruleChecker });
    this._rulesL = new RulesView({ align: 'right', ruleChecker });
    this._display = new GridView({
      cellWidth: cellSize,
      cellHeight: cellSize,
      border: border,
      outerBorder,
      fill: UNKNOWN,
      getChange: (v, alt) => alt ? (v === OFF ? UNKNOWN : OFF) : (v === ON ? UNKNOWN : ON),
    });
    this._display.addEventListener('change', this._change.bind(this));
    this.container = el('div', { 'class': 'game-player' }, [
      el('div', { 'class': 'decoration' }),
      el('div', { 'class': 'corner' }),
      this._rulesT.container,
      this._rulesL.container,
      this._display.canvas,
    ]);
    this.container.style.setProperty('--cellSize', `${cellSize}px`);
    this.container.style.setProperty('--border', `${border}px`);
    this.container.style.setProperty('--outerBorder', `${outerBorder}px`);
    this._rulesT.addEventListener('click', (e) => {
      if (this._readonly) {
        return;
      }
      if (e.detail.state === STATE_COMPLETE) {
        this.completeColumn(e.detail.ruleIndex);
      }
    });
    this._rulesL.addEventListener('click', (e) => {
      if (this._readonly) {
        return;
      }
      if (e.detail.state === STATE_COMPLETE) {
        this.completeRow(e.detail.ruleIndex);
      }
    });
  }

  destroy() {
    this._rulesL.destroy();
    this._rulesT.destroy();
    this._display.destroy();
  }

  setRules(rules) {
    this._rules = rules;
    this._width = rules.cols.length;
    this._height = rules.rows.length;
    this._rulesL.setRules(rules.rows);
    this._rulesT.setRules(rules.cols);
    this._display.resize({ width: this._width, height: this._height });
  }

  setReadOnly(readonly = true) {
    this._readonly = readonly;
    this._display.setReadOnly(readonly);
  }

  clear() {
    this._display.fill(UNKNOWN);
    this._display.clearMarked();
  }

  isStarted() {
    return this._display.getGrid().data.includes(ON);
  }

  isComplete() {
    return this._complete;
  }

  _columnIndices(i) {
    const indices = [];
    for (let j = 0; j < this._height; ++j) {
      indices.push(j * this._width + i);
    }
    return indices;
  }

  _rowIndices(i) {
    const indices = [];
    for (let j = 0; j < this._width; ++j) {
      indices.push(i * this._width + j);
    }
    return indices;
  }

  completeColumn(i) {
    const grid = this._display.getGrid();
    for (const index of this._columnIndices(i)) {
      if (grid.data[index] === UNKNOWN) {
        grid.data[index] = OFF;
      }
    }
    this._display.setGrid(grid);
  }

  completeRow(i) {
    const grid = this._display.getGrid();
    for (const index of this._rowIndices(i)) {
      if (grid.data[index] === UNKNOWN) {
        grid.data[index] = OFF;
      }
    }
    this._display.setGrid(grid);
  }

  checkColumn(i) {
    const board = this._display.getGrid().data;
    this._rulesT.check(i, this._columnIndices(i).map((index) => board[index]));
  }

  checkRow(i) {
    const board = this._display.getGrid().data;
    this._rulesL.check(i, this._rowIndices(i).map((index) => board[index]));
  }

  getGrid() {
    return this._display.getGrid();
  }

  setGrid(grid) {
    if (grid.width !== this._width || grid.height !== this._height) {
      throw new Error('size mismatch');
    }
    this._display.setGrid(grid);
  }

  clearHints() {
    this._hintLevel = 0;
    this._hinting = false;
    this._display.clearMarked();
  }

  _change({ detail: { x, y } }) {
    this.clearHints();
    if (x === undefined) {
      for (let i = 0; i < this._width; ++i) {
        this.checkColumn(i);
      }
    } else {
      this.checkColumn(x);
    }
    if (y === undefined) {
      for (let i = 0; i < this._height; ++i) {
        this.checkRow(i);
      }
    } else {
      this.checkRow(y);
    }
    const wasComplete = this._complete;
    this._complete = this._rulesL.isComplete() && this._rulesT.isComplete();
    this.container.classList.toggle('complete', this._complete);
    this.dispatchEvent(new CustomEvent('change'));
    if (this._complete && !wasComplete) {
      this.dispatchEvent(new CustomEvent('complete'));
    }
  }

  async hint() {
    if (this._hinting || !this._hinter || this._complete) {
      return false;
    }
    const level = this._hintLevel;
    this._hinting = true;

    this._display.clearMarked();
    const grid = this._display.getGrid();
    let step = null;
    try {
      step = await this._hinter.hint(compileGame(this._rules), grid.data);
      if (!this._hinting) {
        return false;
      }
    } catch (e) {
      console.warn(e);
      return false;
    } finally {
      this._hinting = false;
    }

    if (level < 1 && step.hint) {
      if (step.hint.type.startsWith('fork-')) {
        const [begin, ...rest] = step.hint.paths;
        for (const path of rest) {
          this._display.mark('path', path, { r: 1.5 });
        }
        this._display.mark('path', begin, { r: 2.5 });
      } else if (step.hint.type.startsWith('implication-')) {
        const [begin, target, ...rest] = step.hint.paths;
        for (const path of rest) {
          this._display.mark('path', path, { rEnd: 0 });
        }
        this._display.mark('path', begin, { r: 2.5 });
        this._display.mark('path', target, { r: 1.5 });
      } else {
        for (const path of step.hint.paths) {
          this._display.mark('path', path);
        }
      }
      this._hintLevel = 1;
      return true;
    }

    if (step.board) {
      const cells = [];
      for (let i = 0; i < step.board.length; ++i) {
        const v = step.board[i];
        if (v !== grid.data[i] && (v === ON || v === OFF)) {
          cells.push(i);
        }
      }
      this._display.mark('cells', cells);
      this._hintLevel = 0;
      return true;
    }

    this._hintLevel = 0;
    return false;
  }
}
