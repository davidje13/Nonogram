import { UNKNOWN, OFF, ON } from '../src/constants.mjs';
import { compressRules } from '../src/export/rules.mjs';
import { compileGame, rulesForImage } from '../src/game.mjs';
import { LiveSolver } from '../src/solver/LiveSolver.mjs';
import { AmbiguousError } from '../src/solver/errors.mjs';
import { GridPreview } from './GridPreview.mjs';
import { GridView } from './GridView.mjs';
import { Resizer } from './Resizer.mjs';
import { el, makeButton } from './dom.mjs';

export class Editor extends EventTarget {
  constructor({ width, height, cellWidth, cellHeight }) {
    super();

    const info = el('div');
    const definition = el('pre', { 'class': 'definition' });

    const editorView = new GridView({
      width,
      height,
      cellWidth,
      cellHeight,
      fill: OFF,
      getChange: (v, alt) => alt ? null : (v === ON ? OFF : ON),
    });

    const liveSolver = new LiveSolver();

    liveSolver.addEventListener('begin', () => {
      info.textContent = 'Checking game\u2026';
      editorView.clearMarked();
    });

    liveSolver.addEventListener('complete', ({ detail }) => {
      if (!detail.error) {
        info.textContent = 'Game is valid.';
      } else if (detail.error instanceof AmbiguousError) {
        const cells = [];
        for (let i = 0; i < detail.board.length; ++i) {
          if (detail.board[i] === UNKNOWN) {
            cells.push(i);
          }
        }
        editorView.mark('cells', cells);
        info.textContent = 'Game is ambiguous.';
      } else {
        console.error(detail.error);
        info.textContent = 'Error checking game.';
      }
    });

    const preview = new GridPreview();

    const editorChanged = () => {
      const rules = rulesForImage(editorView.getGrid());
      preview.setRules(rules);
      definition.textContent = compressRules(rules);
      liveSolver.solveInBackground(compileGame(rules));
    };

    editorView.addEventListener('change', editorChanged);

    const editorResizer = new Resizer(editorView.canvas, {
      getCurrentSize: () => editorView.getGrid(),
      xScale: editorView.getTotalCellSize().width,
      yScale: editorView.getTotalCellSize().height,
      xMin: 1,
      yMin: 1,
    });

    editorResizer.addEventListener('change', ({ detail }) => editorView.resize({
      width: detail.width,
      height: detail.height,
      dx: detail.dx,
      dy: detail.dy,
      fill: OFF,
    }));

    this.container = el('div', { 'class': 'editor' }, [
      el('h2', {}, 'Editor'),
      el('div', { 'class': 'options' }, [
        makeButton('clear', () => editorView.fill(OFF)),
        makeButton('play', () => {
          const rules = compressRules(rulesForImage(editorView.getGrid()));
          this.dispatchEvent(new CustomEvent('play', { detail: { rules } }));
        }),
      ]),
      editorResizer.container,
      info,
      preview.canvas,
      definition,
    ]);

    editorChanged();
  }
}
