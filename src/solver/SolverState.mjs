import { UNKNOWN, OFF, ON } from '../constants.mjs';
import { InvalidGameError } from './errors.mjs';

export class SolverState {
  constructor(board) {
    this.board = board;
    this._cache = new Map();
    this.changed = false;
  }

  clone() {
    const copy = new SolverState(new Uint8Array(this.board));
    for (const [k, v] of this._cache.entries()) {
      copy._cache.set(k, new Map(v));
    }
    return copy;
  }

  setCell(index, value) {
    const old = this.board[index];
    if (old !== value) {
      if (old !== UNKNOWN) {
        throw new InvalidGameError('contradiction', index);
      }
      this.board[index] = value;
      this.changed = true;
    }
  }

  set(replacement) {
    this.board.set(replacement.board);
    this._cache = replacement._cache;
    this.changed = true;
  }

  getCache(key) {
    let c = this._cache.get(key);
    if (!c) {
      c = new Map();
      this._cache.set(key, c);
    }
    return c;
  }

  readBoardLine(boardLine, cellIndices) {
    for (let n = 0; n < cellIndices.length; ++n) {
      boardLine[n] = this.board[cellIndices[n]];
    }
  }

  writeBoardLine(boardLine, cellIndices) {
    for (let n = 0; n < cellIndices.length; ++n) {
      const index = cellIndices[n];
      const value = boardLine[n];
      const old = this.board[index];
      if (old !== value) {
        if (old !== UNKNOWN) {
          throw new InvalidGameError('contradiction', index);
        }
        this.board[index] = value;
        this.changed = true;
      }
    }
  }

  countBoardLine(boardLine, cellIndices) {
    let on = 0;
    let off = 0;
    for (let n = 0; n < cellIndices.length; ++n) {
      const value = boardLine[n];
      if (this.board[cellIndices[n]] !== value) {
        if (value === ON) {
          ++on;
        } else if (value === OFF) {
          ++off;
        }
      }
    }
    return { on, off };
  }
}
