import { UNKNOWN, ON, OFF } from '../../constants.mjs';
import { AmbiguousError, InvalidGameError } from '../errors.mjs';
import { perlRegexp } from './isolated-rules/perl-regexp.mjs';

function makeCheck(checker, rules) {
  const auxChecks = rules.map(({ raw, cellIndices }) => ({
    substate: new Uint8Array(cellIndices.length),
    cellIndices,
    check: checker(raw),
  }));

  const check = (state) => {
    for (const auxCheck of auxChecks) {
      state.readSubstate(auxCheck.substate, auxCheck.cellIndices);
      auxCheck.check(auxCheck.substate);
    }
  };

  return { check, auxChecks };
}

function judgeImportance(auxChecks, state, position) {
  let solvedOn = 0;
  let solvedOff = 0;
  for (const { substate, cellIndices, check } of auxChecks) {
    const rulePos = cellIndices.indexOf(position);
    if (rulePos === -1) {
      continue;
    }
    state.readSubstate(substate, cellIndices);
    const initialUnknown = countUnknown(substate);
    const substateOn = substate;
    const substateOff = new Uint8Array(substate);
    substateOn[rulePos] = ON;
    substateOff[rulePos] = OFF;
    check(substateOn);
    check(substateOff);
    solvedOn += initialUnknown - countUnknown(substateOn);
    solvedOff += initialUnknown - countUnknown(substateOff);
  }
  return { on: solvedOn, off: solvedOff };
}

function countUnknown(substate) {
  let count = 0;
  for (const v of substate) {
    if (v === UNKNOWN) {
      ++count;
    }
  }
  return count;
}

function pickGuessSpot(auxChecks, state, sharedState) {
  let bestI = 0;
  let bestN = -1;
  let bestDir = OFF;

  // shallow breadth-first search to find a good candidate location for making a guess
  for (let i = 0; i < state.board.length; ++i) {
    if (state.board[i] === UNKNOWN) {
      const counts = sharedState.impacts?.get(i) ?? judgeImportance(auxChecks, state, i);
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

export const parallelFork = (checker = perlRegexp) => (rules) => {
  const { check, auxChecks } = makeCheck(checker, rules);

  return function* (state, { solve, sharedState }) {
    const trial = pickGuessSpot(auxChecks, state, sharedState);
    //process.stderr.write(`Guessing at position ${trial.i}\n`);

    const state1 = state.clone();
    const state2 = state.clone();
    state1.board[trial.i] = ON;
    state2.board[trial.i] = OFF;
    const iterator1 = solve(state1);
    const iterator2 = solve(state2);

    // run both in parallel until one has a conflict (throws an exception)
    let success1 = false;
    let success2 = false;
    while (true) {
      if (!success1) {
        try {
          const sub = iterator1.next();
          check(state1);
          yield sub.value;
          success1 = sub.done;
        } catch (e) {
          if (e instanceof InvalidGameError) {
            state.set(state2);
            return;
          } else {
            throw e;
          }
        }
      }
      if (!success2) {
        try {
          const sub = iterator2.next();
          check(state2);
          yield sub.value;
          success2 = sub.done;
        } catch (e) {
          if (e instanceof InvalidGameError) {
            state.set(state1);
            return;
          } else {
            throw e;
          }
        }
      }
      if (success1 && success2) {
        throw new AmbiguousError([state1.board, state2.board]);
      }
    }
  };
};

export const synchronousFork = (checker = perlRegexp) => (rules) => {
  const { check, auxChecks } = makeCheck(checker, rules);

  return function* (state, { solve, sharedState }) {
    const trial = pickGuessSpot(auxChecks, state, sharedState);
    //process.stderr.write(`Guessing at position ${trial.i}\n`);

    const states = [state.clone(), state.clone()];
    const values = trial.dir === ON ? [ON, OFF] : [OFF, ON];
    let success = null;
    let remaining = states.length;
    for (let i = 0; i < states.length; ++i) {
      const subState = states[i];
      subState.board[trial.i] = values[i];
      if (remaining === 1 && success === null) {
        success = subState;
        break;
      }
      const iterator = solve(subState);
      try {
        while (!iterator.next().done) {
          check(subState);
        }
        if (success !== null) {
          throw new AmbiguousError([success.board, subState.board]);
        }
        success = subState;
      } catch (e) {
        if (e instanceof InvalidGameError) {
          --remaining;
        } else {
          throw e;
        }
      }
    }
    state.set(success);
  };
};
