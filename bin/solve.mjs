#!/usr/bin/env node

import { performance } from 'node:perf_hooks';

import { readInputRules } from './input.mjs';
import { drawGameBoard } from '../src/draw.mjs';
import { compileGame } from '../src/game.mjs';
import { UNKNOWN } from '../src/constants.mjs';
import { compressImage } from '../src/export/image.mjs';
import { compressRules } from '../src/export/rules.mjs';
import { AmbiguousError, InvalidGameError, StuckError } from '../src/solver/errors.mjs';
import { thoroughSolver } from '../src/solver/standard-solvers.mjs';

for (const { name, rules } of readInputRules()) {
  process.stdout.write(`\nSolving ${name}\n`);
  const game = compileGame(rules);
  const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

  const tmBegin = performance.now();
  let tmEnd;
  try {
    thoroughSolver(game.rules).solve(board);
    tmEnd = performance.now();
    drawGameBoard(game, board);
  } catch (e) {
    tmEnd = performance.now();
    if (e instanceof AmbiguousError) {
      process.stderr.write('Multiple solutions found. Examples (there may be more):\n\n');
      for (const exampleBoard of e.exampleBoards) {
        drawGameBoard(game, exampleBoard);
        process.stderr.write('\n');
      }
      process.stderr.write('Solution before uncertainty:\n\n');
      drawGameBoard(game, board);
    } else if (e instanceof StuckError) {
      process.stderr.write('Stuck while solving with currently configured methods:\n\n');
      drawGameBoard(game, board);
    } else if (e instanceof InvalidGameError) {
      process.stderr.write(`Game does not have a well-defined solution: ${e.message}\n`);
      process.stderr.write('Progress: (other possible partial solutions exist)\n\n');
      drawGameBoard(game, board);
    } else {
      throw e;
    }
  }

  process.stdout.write(`\n`);
  process.stdout.write(`Short image: ${compressImage({ width: game.w, height: game.h, data: board })}\n`);
  try {
    process.stdout.write(`Short rules: ${compressRules(game)}\n`);
  } catch {}
  process.stdout.write(`Solving time: ${(tmEnd - tmBegin).toFixed(1)}ms\n`);
}
