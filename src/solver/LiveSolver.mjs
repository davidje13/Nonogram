import { AmbiguousError } from './errors.mjs';

const workerPath = new URL('./live-solver-worker.mjs', import.meta.url).href;

export class LiveSolver extends EventTarget {
  constructor() {
    super();

    this.activeID = 0;
    this.worker = new Worker(workerPath, { type: 'module' });
    this.worker.addEventListener('message', ({ data: { id, error, board } }) => {
      if (id === this.activeID) {
        if (typeof error === 'object' && error?.exampleBoards) {
          error = new AmbiguousError(error.exampleBoards);
        }
        this.dispatchEvent(new CustomEvent('complete', { detail: { error, board } }));
      }
    });
  }

  solveInBackground(game) {
    ++this.activeID;
    this.dispatchEvent(new CustomEvent('begin'));
    this.worker.postMessage({ game, id: this.activeID });
  }
}
