import { AmbiguousError } from './errors.mjs';

const workerPath = new URL('./live-solver-worker.mjs', import.meta.url).href;

export class LiveSolver extends EventTarget {
  constructor() {
    super();

    this.activeID = 0;
    this.callback = null;
    this.worker = new Worker(workerPath, { type: 'module' });
    this.worker.addEventListener('message', ({ data: { id, error, ...data } }) => {
      if (id === this.activeID) {
        if (typeof error === 'object' && error?.exampleBoards) {
          error = new AmbiguousError(error.exampleBoards);
        }
        this.callback(error, data);
      }
    });
  }

  solveInBackground(game, current = null) {
    ++this.activeID;
    this.callback = (error, { board }) => this.dispatchEvent(new CustomEvent('complete', { detail: { error, board } }));
    this.dispatchEvent(new CustomEvent('begin'));
    this.worker.postMessage({ game, current, id: this.activeID });
  }

  hint(game, current) {
    return new Promise((resolve, reject) => {
      ++this.activeID;
      this.callback = (error, data) => {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      };
      this.worker.postMessage({ game, current, id: this.activeID, hint: true });
    });
  }
}
