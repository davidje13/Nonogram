import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { GridView } from './GridView.mjs';

class RulesView {
  constructor({ cellSize, border, align }) {
    this.container = document.createElement('div');
    this.container.className = `rules align-${align}`;
    this.container.style.setProperty('--cellSize', `${cellSize}px`);
    this.container.style.setProperty('--border', `${border}px`);
  }

  setRules(rules) {
    this.container.textContent = '';
    for (const rule of rules) {
      const els = document.createElement('div');
      for (const v of rule.length > 0 ? rule : [0]) {
        const el = document.createElement('div');
        el.textContent = String(v);
        els.append(el);
      }
      this.container.append(els);
    }
  }
}

export class GamePlayer {
  constructor({ cellSize, border }) {
    this._rulesT = new RulesView({
      cellSize,
      border,
      align: 'bottom',
    });
    this._rulesL = new RulesView({
      cellSize,
      border,
      align: 'right',
    });
    this._display = new GridView({
      cellWidth: cellSize,
      cellHeight: cellSize,
      border,
      fill: UNKNOWN,
      getChange: (v, alt) => alt ? (v === OFF ? UNKNOWN : OFF) : (v === OFF ? null : v === ON ? UNKNOWN : ON),
    });
    this.container = document.createElement('div');
    this.container.className = 'container';
    this.container.append(
      document.createElement('div'),
      this._rulesT.container,
      this._rulesL.container,
      this._display.canvas,
    );
  }

  setRules(rules) {
    this._rulesL.setRules(rules.rows);
    this._rulesT.setRules(rules.cols);
    this._display.resize({ width: rules.cols.length, height: rules.rows.length });
  }
}
