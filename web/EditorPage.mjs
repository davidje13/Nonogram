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
    const validation = el('div', { 'class': 'validation' });

    this.editorView = new GridView({
      width,
      height,
      cellWidth,
      cellHeight,
      fill: OFF,
      getChange: (v, alt) => alt ? null : (v === ON ? OFF : ON),
    });

    const liveSolver = new LiveSolver();

    liveSolver.addEventListener('begin', () => {
      validation.textContent = 'Checking game\u2026';
      validation.className = 'validation checking';
      this.editorView.clearMarked();
    });

    liveSolver.addEventListener('complete', ({ detail }) => {
      if (!detail.error) {
        validation.textContent = 'Game is valid.';
        validation.className = 'validation valid';
      } else if (detail.error instanceof AmbiguousError) {
        const cells = [];
        for (let i = 0; i < detail.board.length; ++i) {
          if (detail.board[i] === UNKNOWN) {
            cells.push(i);
          }
        }
        this.editorView.mark('cells', cells);
        validation.textContent = 'Game is ambiguous.';
        validation.className = 'validation ambiguous';
      } else {
        console.error(detail.error);
        validation.textContent = 'Error checking game.';
        validation.className = 'validation error';
      }
    });

    const preview = new GridPreview();

    const editorChanged = () => {
      const rules = this.getRules();
      preview.setRules(rules);
      liveSolver.solveInBackground(compileGame(rules));
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
    this.validation = validation;
    this.preview = preview.container;

    editorChanged();
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
