import { Judge } from './Judge.mjs';
import { AmbiguousError } from './errors.mjs';

const workerPath = new URL('./live-solver-worker.mjs', import.meta.url).href;

export class LiveSolver {
  constructor() {
    this.activeID = 0;
    this.callback = null;
    this.worker = new Worker(workerPath, { type: 'module' });
    this.worker.addEventListener('message', ({ data: { id, error, ...data } }) => {
      if (id === this.activeID) {
        if (typeof error === 'object' && error?.exampleBoards) {
          error = new AmbiguousError(error.exampleBoards);
        }
        const fn = this.callback;
        this.callback = null;
        fn(error, data);
      }
    });
  }

  _run(game, current, mode) {
    return new Promise((resolve, reject) => {
      ++this.activeID;
      this.callback = (error, data) => {
        if (error) {
          error.data = data;
          reject(error);
        } else {
          resolve(data);
        }
      };
      this.worker.postMessage({ game, current, id: this.activeID, mode });
    });
  }

  solve(game, current = null) {
    return this._run(game, current, 'solve');
  }

  async judge(game, current = null) {
    const data = await this._run(game, current, 'judge');
    data.judge = Object.assign(new Judge(0, 0), data.judge);
    return data;
  }

  hint(game, current) {
    return this._run(game, current, 'hint');
  }
}
