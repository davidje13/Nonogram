#!/usr/bin/env node

import { readInputRules } from './input.mjs';
import { compileGame } from '../src/game.mjs';
import { UNKNOWN } from '../src/constants.mjs';
import { AmbiguousError, InvalidGameError, StuckError } from '../src/solver/errors.mjs';
import { fastSolver, hintSolver } from '../src/solver/standard-solvers.mjs';
import { Judge } from '../src/solver/Judge.mjs';
import { writeCSVCell } from '../src/data/csv.mjs';

process.stdout.write('Game,Width,Height,Difficulty,Tedium,Steps\n');
const errors = [];

for (const { name, rules } of readInputRules()) {
  const game = compileGame(rules);
  const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

  try {
    fastSolver(game.rules).solve(board);
  } catch (e) {
    errors.push({ name, e });
    continue;
  }

  const judge = new Judge(game.w, game.h);

  board.fill(UNKNOWN);
  for (const step of hintSolver(game.rules).solveSteps(board, true)) {
    judge.accumulate(step);
  }

  row({ name, game, judge });
}

if (errors.length > 0) {
  process.stdout.write('\nGames skipped due to errors:\n');
  for (const { name, e } of errors) {
    if (e instanceof AmbiguousError) {
      process.stdout.write(`${name} [ambiguous]\n`);
    } else if (e instanceof StuckError) {
      process.stdout.write(`${name} [stuck]\n`);
    } else if (e instanceof InvalidGameError) {
      process.stdout.write(`${name} [invalid]\n`);
    } else {
      process.stdout.write(`${name} [internal error]: ${e}\n`);
    }
  }
}

function row({ name, game, judge }) {
  process.stdout.write([
    name,
    game.w,
    game.h,
    judge?.difficulty,
    judge?.tedium,
    judge?.steps,
  ].map(writeCSVCell).join(',') + '\n');
}
