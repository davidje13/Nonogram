import { makeBoard } from './board.mjs';

export class LiveSolver extends EventTarget {
  constructor(solver, {
    getNow = Date.now,
    frameTimeLimit = 10,
    nextFrameFn = (fn) => setTimeout(fn, 0),
  } = {}) {
    super();
    this._solver = solver;
    this._getNow = getNow;
    this._frameTimeLimit = frameTimeLimit;
    this._nextFrameFn = nextFrameFn;
    this._board = null;
    this._iterator = null;
    this._iterateFrame = null;
    this._iterate = this._iterate.bind(this);
  }

  update(game) {
    this._board = makeBoard(game);
    this._iterator = this._solver(game.rules).solveSteps(this._board);
    this.dispatchEvent(new CustomEvent('begin'));
    if (this._iterateFrame === null) {
      this._iterate();
    }
  }

  _iterate() {
    const timeout = this._getNow() + this._frameTimeLimit;
    try {
      while (!this._iterator.next().done) {
        if (this._getNow() >= timeout) {
          this._iterateFrame = this._nextFrameFn(this._iterate);
          return;
        }
      }
      this._iterateFrame = null;
      this.dispatchEvent(new CustomEvent('complete', { detail: {
        error: null,
        board: this._board,
      } }));
    } catch (error) {
      this._iterateFrame = null;
      this.dispatchEvent(new CustomEvent('complete', { detail: {
        error,
        board: this._board,
      } }));
    }
  }
}
