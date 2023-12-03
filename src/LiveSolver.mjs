import { AmbiguousError } from './solver/errors.mjs';

export class LiveSolver extends EventTarget {
  constructor(workerPath) {
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

  update(game) {
    ++this.activeID;
    this.dispatchEvent(new CustomEvent('begin'));
    this.worker.postMessage({ game, id: this.activeID });
  }
}
