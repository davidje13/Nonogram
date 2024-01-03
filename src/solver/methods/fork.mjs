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

function* runParallel(paths, maxDepth, check, resultOut) {
  const valid = [];
  const possible = [];

  // run both in parallel until one has a conflict (throws an exception)
  for (let n = 0; n < maxDepth; ++n) {
    for (const path of paths) {
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
        } else {
          throw e;
        }
        done = true;
      }
      if (done) {
        paths.splice(paths.indexOf(path), 1);
        if (paths.length === 1 && valid.length + possible.length === 0) {
          possible.push(paths.pop().state);
        }
        if (paths.length) {
          break;
        }
        if (valid.length > 1) {
          throw new AmbiguousError(valid.map((v) => v.board));
        }
        const outcome = [...valid, ...possible];
        if (outcome.length === 1) {
          resultOut.state = outcome[0];
        }
        return;
      }
    }
  }
}

function* runSynchronous(paths, maxDepth, check, resultOut) {
  let stuck = false;
  let result = null;
  let remaining = paths.length;
  for (const path of paths) {
    if (remaining === 1 && result === null) {
      resultOut.state = path.state;
      return;
    }
    try {
      for (let n = 0; ; ++n) {
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
        if (n >= maxDepth) {
          throw new StuckError();
        }
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
      } else {
        throw e;
      }
    }
  }
  resultOut.state = result;
}

export const fork = ({
  parallel = true,
  checker = perlRegexp,
  maxDepth = Number.POSITIVE_INFINITY,
  fastSolve = true,
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

    const result = { state: null, conflictIndex: null };
    yield* fn(paths, maxDepth, check, result);

    if (result.state) {
      if (hint) {
        const path = [trial.i];
        if (result.conflictIndex !== null) {
          path.push(result.conflictIndex);
        }
        yield { hint: { type: 'fork', paths: [path] } };
      }
      if (fastSolve) {
        state.set(result.state);
      } else {
        state.setCell(trial.i, result.state.board[trial.i]);
      }
    }
  };
};
