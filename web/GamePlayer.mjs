import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame } from '../src/game.mjs';
import { GridView } from './GridView.mjs';
import { el } from './dom.mjs';

class RulesView {
  constructor({ cellSize, border, align, ruleChecker = null }) {
    this.container = el('div', { 'class': `rules align-${align}` });
    this.container.style.setProperty('--cellSize', `${cellSize}px`);
    this.container.style.setProperty('--border', `${border}px`);
    this._ruleChecker = ruleChecker;
    this._rules = [];
  }

  setRules(rules) {
    this.container.textContent = '';
    this._rules.length = 0;
    for (const rule of rules) {
      const els = el('div');
      let total = 0;
      let checker = null;
      if (rule) {
        for (const v of rule.length > 0 ? rule : [0]) {
          els.append(el('div', {}, [String(v)]));
          total += v;
        }
        checker = this._ruleChecker?.(rule);
      } else {
        els.append(el('div', {}, ['?']));
      }
      this.container.append(els);
      this._rules.push({ dom: els, total, checker });
    }
  }

  check(i, boardLine) {
    const r = this._rules[i];
    if (!r || !r.checker) {
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
      r.dom.className = (n === r.total ? 'done' : '');
    } catch {
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
    this._hinter = hinter;
    this._hintLevel = 0;
    this._hinting = false;
    this._rulesT = new RulesView({
      cellSize,
      border,
      align: 'bottom',
      ruleChecker,
    });
    this._rulesL = new RulesView({
      cellSize,
      border,
      align: 'right',
      ruleChecker,
    });
    this._display = new GridView({
      cellWidth: cellSize,
      cellHeight: cellSize,
      border,
      fill: UNKNOWN,
      getChange: (v, alt) => alt ? (v === OFF ? UNKNOWN : OFF) : (v === ON ? UNKNOWN : ON),
    });
    this._display.addEventListener('change', this._change.bind(this));
    this.container = el('div', { 'class': 'game-player' }, [
      el('div'),
      this._rulesT.container,
      this._rulesL.container,
      this._display.canvas,
    ]);
  }

  setRules(rules) {
    this._rules = rules;
    this._width = rules.cols.length;
    this._height = rules.rows.length;
    this._rulesL.setRules(rules.rows);
    this._rulesT.setRules(rules.cols);
    this._display.resize({ width: this._width, height: this._height });
  }

  clear() {
    this._display.fill(UNKNOWN);
  }

  isStarted() {
    return this._display.getGrid().data.includes(ON);
  }

  isComplete() {
    return false; // TODO
  }

  checkColumn(i, board) {
    const col = new Uint8Array(this._height);
    for (let j = 0; j < this._height; ++j) {
      col[j] = board[j * this._width + i];
    }
    this._rulesT.check(i, col);
  }

  checkRow(i, board) {
    this._rulesL.check(i, board.subarray(i * this._width, (i + 1) * this._width));
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

  _change({ detail: { data, x, y } }) {
    this._hintLevel = 0;
    this._hinting = false;
    this._display.clearMarked();
    if (x === undefined) {
      for (let i = 0; i < this._width; ++i) {
        this.checkColumn(i, data);
      }
    } else {
      this.checkColumn(x, data);
    }
    if (y === undefined) {
      for (let i = 0; i < this._height; ++i) {
        this.checkRow(i, data);
      }
    } else {
      this.checkRow(y, data);
    }
    this.dispatchEvent(new CustomEvent('change'));
  }

  async hint() {
    if (this._hinting || !this._hinter) {
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
      for (const path of step.hint.paths) {
        this._display.mark('path', path);
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
