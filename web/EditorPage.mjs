import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GridView } from './GridView.mjs';
import { Resizer } from './Resizer.mjs';
import { el } from './dom.mjs';

export class EditorPage {
  constructor({ width, height, cellWidth, cellHeight }) {
    this.validation = el('div', { 'class': 'validation' });

    this.editorView = new GridView({
      width,
      height,
      cellWidth,
      cellHeight,
      fill: OFF,
      getChange: (v, alt) => alt ? null : (v === ON ? OFF : ON),
    });

    this.liveSolver = new LiveSolver();
    const preview = new GridPreview();

    const editorChanged = async () => {
      const rules = this.getRules();
      preview.setRules(rules);

      const game = compileGame(rules);
      if (await this._validateGame(game)) {
        await this._judgeGame(game);
      }
    };

    this.editorView.addEventListener('change', editorChanged);

    const editorResizer = new Resizer(this.editorView.canvas, {
      getCurrentSize: () => this.editorView.getGrid(),
      xScale: this.editorView.getTotalCellSize().width,
      yScale: this.editorView.getTotalCellSize().height,
      xMin: 1,
      yMin: 1,
    });

    editorResizer.addEventListener('change', ({ detail }) => this.editorView.resize({
      width: detail.width,
      height: detail.height,
      dx: detail.dx,
      dy: detail.dy,
      fill: OFF,
    }));

    this.container = editorResizer.container;
    this.preview = preview.container;

    editorChanged();
  }

  async _validateGame(game) {
    this.validation.textContent = 'Checking game\u2026';
    this.validation.className = 'validation checking';
    this.editorView.clearMarked();

    try {
      await this.liveSolver.solve(game);
      this.validation.textContent = 'Game is valid.';
      this.validation.className = 'validation valid';
      return true;
    } catch (e) {
      if (e instanceof AmbiguousError) {
        const cells = [];
        for (let i = 0; i < e.data.board.length; ++i) {
          if (e.data.board[i] === UNKNOWN) {
            cells.push(i);
          }
        }
        this.editorView.mark('cells', cells);
        this.validation.textContent = 'Game is ambiguous.';
        this.validation.className = 'validation ambiguous';
      } else {
        console.error(e);
        this.validation.textContent = 'Error checking game.';
        this.validation.className = 'validation error';
      }
    }
    return false;
  }

  async _judgeGame(game) {
    // TODO
    //try {
    //  const { judge } = await this.liveSolver.judge(game);
    //  console.log(judge);
    //} catch (e) {
    //  console.error(e);
    //}
  }

  clear() {
    this.editorView.fill(OFF);
  }

  getGrid() {
    return this.editorView.getGrid();
  }

  setGrid(grid) {
    this.editorView.setGrid(grid);
  }

  getRules() {
    return rulesForImage(this.editorView.getGrid());
  }
}
