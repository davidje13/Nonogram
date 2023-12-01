#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { drawGameBoard } from './draw.mjs';
import { compileGame, extractRules } from './game.mjs';
import { makeBoard } from './board.mjs';
import { toShortByImage, toShortByRules } from './export.mjs';
import { solver } from './solver/solver.mjs';
import { AmbiguousError, InvalidGameError, StuckError } from './solver/errors.mjs';
import { implications } from './solver/methods/implications.mjs';
import { fork } from './solver/methods/fork.mjs';
import { isolatedRules } from './solver/methods/isolated-rules.mjs';
import { trivial } from './solver/methods/isolated-rules/trivial.mjs';
import { regExp } from './solver/methods/isolated-rules/regexp.mjs';
import { perlRegexp } from './solver/methods/isolated-rules/perl-regexp.mjs';
import { caps } from './solver/methods/isolated-rules/caps.mjs';

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

//const difficultyJudgeSolver = solver(
//  isolatedRules(trivial),
//  isolatedRules(caps),
//  isolatedRules(regExp),
//  isolatedRules(perlRegexp),
//  implications({ maxDepth: 2 }),
//  implications(),
//  fork({ parallel: false, maxDepth: 5, fastSolve: false }),
//  fork({ parallel: false, fastSolve: false }),
//);

function run(gameFile) {
  const rules = extractRules(JSON.parse(readFileSync(gameFile)));
  const game = compileGame(rules);
  const board = makeBoard(game);

  const tmBegin = performance.now();
  let tmEnd;
  try {
    fastSolver(game.rules).solve(board);
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
  process.stdout.write(`Short image: ${toShortByImage(game, board)}\n`);
  process.stdout.write(`Short rules: ${toShortByRules(game)}\n`);
  process.stdout.write(`Solving time: ${(tmEnd - tmBegin).toFixed(1)}ms\n`);
}

if (process.argv.length < 3) {
  run(process.stdin.fd);
} else {
  for (let i = 2; i < process.argv.length; ++ i) {
    const gameFile = process.argv[i];
    process.stdout.write(`\nSolving ${gameFile}\n`);
    run(gameFile);
  }
}
