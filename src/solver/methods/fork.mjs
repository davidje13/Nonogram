import { UNKNOWN, ON, OFF } from '../../constants.mjs';
import { AmbiguousError, InvalidGameError, StuckError } from '../errors.mjs';
import { perlRegexp } from './isolated-rules/perl-regexp.mjs';

const IMPACT_USED = { on: 1, off: 1 };

function makeCheck(checker, rules) {
  const auxChecks = rules.map(({ raw, cellIndices }) => ({
    boardLine: new Uint8Array(cellIndices.length),
    cellIndices,
    check: checker(raw),
  }));

  const check = (state) => {
    for (const auxCheck of auxChecks) {
      state.readBoardLine(auxCheck.boardLine, auxCheck.cellIndices);
      auxCheck.check(auxCheck.boardLine);
    }
  };

  return { check, auxChecks };
}

function judgeImportance(auxChecks, state, position) {
  let solvedOn = 0;
  let solvedOff = 0;
  for (const { boardLine, cellIndices, check } of auxChecks) {
    const rulePos = cellIndices.indexOf(position);
    if (rulePos === -1) {
      continue;
    }
    state.readBoardLine(boardLine, cellIndices);
    const initialUnknown = countUnknown(boardLine);
    const boardLineOn = boardLine;
    const boardLineOff = new Uint8Array(boardLine);
    boardLineOn[rulePos] = ON;
    boardLineOff[rulePos] = OFF;
    check(boardLineOn);
    check(boardLineOff);
    solvedOn += initialUnknown - countUnknown(boardLineOn);
    solvedOff += initialUnknown - countUnknown(boardLineOff);
  }
  return { on: solvedOn, off: solvedOff };
}

function countUnknown(boardLine) {
  let count = 0;
  for (const v of boardLine) {
    if (v === UNKNOWN) {
      ++count;
    }
  }
  return count;
}

function pickGuessSpot(auxChecks, state, impacts) {
  let bestI = 0;
  let bestN = -1;
  let bestDir = OFF;

  // shallow breadth-first search to find a good candidate location for making a guess
  for (let i = 0; i < state.board.length; ++i) {
    if (state.board[i] === UNKNOWN) {
      let counts = impacts.get(i);
      if (!counts) {
        counts = judgeImportance(auxChecks, state, i);
        impacts.set(i, counts);
      }
      const n = Math.log(counts.on) + Math.log(counts.off);
      if (n > bestN) {
        bestI = i;
        bestN = n;
        bestDir = counts.on > counts.off ? ON : OFF;
      }
    }
  }
  return { i: bestI, dir: bestDir };
}

function sharedChecker(paths, resultOut) {
  const n = paths[0].state.board.length;
  const unknowns = [];
  for (let i = 0; i < n; ++i) {
    if (paths[0].state.board[i] === UNKNOWN) {
      unknowns.push(i);
    }
  }

  return (depth) => {
    const matches = unknowns.filter((i) => {
      const v = paths[0].state.board[i];
      if (v === UNKNOWN) {
        return false;
      }
      for (let j = 1; j < paths.length; ++j) {
        if (paths[j].state.board[i] !== v) {
          return false;
        }
      }
      return true;
    });
    if (!matches.length) {
      return false;
    }
    resultOut.regardless = matches.map((i) => ({ cell: i, value: paths[0].state.board[i] }));
    resultOut.depth = depth;
    return true;
  };
}

function* runParallel(paths, check, resultOut) {
  const valid = [];
  const possible = [];

  const checkShared = sharedChecker(paths, resultOut);

  // run both in parallel until one has a conflict (throws an exception),
  // or all games agree on a particular cell's value
  const livePaths = [...paths];
  for (let n = 0; ; ++n) {
    for (const path of livePaths) {
      let done = false;
      try {
        const sub = path.iterator.next();
        check(path.state);
        if (sub.done) {
          valid.push(path.state);
          done = true;
        }
        yield sub.value;
      } catch (e) {
        if (e instanceof StuckError) {
          possible.push(path.state);
        } else if (e instanceof InvalidGameError) {
          if (e.conflictIndex !== null) {
            resultOut.conflictIndex = e.conflictIndex;
          }
        } else if (e instanceof AmbiguousError) {
          if (checkShared(n)) { // prefer to solve as much as possible when game is ambiguous
            return;
          }
          throw e;
        } else {
          throw e;
        }
        done = true;
      }
      if (done) {
        livePaths.splice(livePaths.indexOf(path), 1);
        if (livePaths.length === 1 && valid.length + possible.length === 0) {
          possible.push(livePaths.pop().state);
        }
        if (livePaths.length) {
          break;
        }
        if (valid.length > 1) {
          if (checkShared(n)) { // prefer to solve as much as possible when game is ambiguous
            return;
          }
          throw new AmbiguousError(valid.map((v) => v.board));
        }
        const outcome = [...valid, ...possible];
        if (outcome.length === 1) {
          resultOut.state = outcome[0];
          resultOut.depth = n;
        }
        return;
      }
    }
    if (n % 30 === 0 && checkShared(n)) {
      return;
    }
  }
}

function* runSynchronous(paths, check, resultOut) {
  const checkShared = sharedChecker(paths, resultOut);

  let stuck = false;
  let result = null;
  let actualDepth = Number.POSITIVE_INFINITY;
  let remaining = paths.length;
  for (const path of paths) {
    if (remaining === 1 && result === null) {
      result = path.state;
      break;
    }
    let n = 0;
    try {
      while (true) {
        const sub = path.iterator.next();
        check(path.state);
        if (sub.done) {
          if (stuck) {
            return; // cannot say for sure if one path is the correct one
          } else if (result !== null) {
            throw new AmbiguousError([result.board, path.state.board]);
          } else {
            result = path.state;
            break;
          }
        }
        ++n;
        yield;
      }
    } catch (e) {
      if (e instanceof InvalidGameError) {
        if (e.conflictIndex !== null) {
          resultOut.conflictIndex = e.conflictIndex;
        }
        --remaining;
      } else if (e instanceof StuckError) {
        if (result !== null) {
          return; // cannot say for sure if one path is the correct one
        }
        result = path.state;
        stuck = true;
      } else if (e instanceof AmbiguousError) {
        // prefer to solve as much as possible when game is ambiguous
        // (note: this will still short-circuit the analysis, so will not resolve as much as runParallel)
        if (checkShared(n)) {
          return;
        }
        throw e;
      } else {
        throw e;
      }
    }
    actualDepth = Math.min(actualDepth, n);
  }
  resultOut.state = result;
  resultOut.depth = actualDepth;
}

export const fork = ({
  parallel = true,
  checker = perlRegexp,
  fastSolve = true,
  baseDifficulty = 1,
  baseTedium = 1,
} = {}) => (rules) => {
  const { check, auxChecks } = makeCheck(checker, rules);
  const fn = parallel ? runParallel : runSynchronous;

  return function* (state, { solve, hint, sharedState }) {
    let impacts = sharedState.get('impacts');
    if (!impacts) {
      impacts = new Map();
      sharedState.set('impacts', impacts);
    }
    const trial = pickGuessSpot(auxChecks, state, impacts);
    impacts.set(trial.i, IMPACT_USED);
    //process.stderr.write(`Guessing at position ${trial.i}\n`);

    const paths = [
      { state: state.clone(), value: ON, iterator: null },
      { state: state.clone(), value: OFF, iterator: null },
    ];
    if (trial.dir === OFF) {
      paths.reverse();
    }
    for (const path of paths) {
      path.state.board[trial.i] = path.value;
      path.iterator = solve(path.state);
    }

    const result = { state: null, regardless: null, conflictIndex: null };
    yield* fn(paths, check, result);

    if (result.regardless) {
      for (const { cell, value } of result.regardless) {
        state.setCell(cell, value);
      }
      if (hint) {
        yield { hint: {
          type: 'fork-regardless',
          paths: [[trial.i], ...result.regardless.map(({ cell }) => [cell])],
          difficulty: result.depth * 2 * baseDifficulty,
          tedium: result.depth * 2 * baseTedium,
        } };
      }
    }
    if (result.state) {
      if (fastSolve) {
        state.set(result.state);
      } else {
        state.setCell(trial.i, result.state.board[trial.i]);
      }
      if (hint) {
        const paths = [[trial.i]];
        if (result.conflictIndex !== null) {
          paths.push([result.conflictIndex]);
        }
        yield { hint: {
          type: 'fork-contradiction',
          paths,
          difficulty: result.depth * baseDifficulty,
          tedium: result.depth * 2 * baseTedium,
        } };
      }
    }
  };
};
