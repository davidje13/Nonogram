#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

import { drawGameState } from './draw.mjs';
import { compileGame } from './game.mjs';
import { makeState } from './state.mjs';
import { Solver } from './Solver.mjs';
import { AmbiguousError } from './AmbiguousError.mjs';
import { StuckError } from './StuckError.mjs';
import { toShortByImage, toShortByRules } from './export.mjs';
import solverTrivial from './solvers/trivial.mjs';
import solverRegexp from './solvers/regexp.mjs';
import solverPerlRegexp from './solvers/perl-regexp.mjs';
import solverCaps from './solvers/caps.mjs';
import solverImplications from './multi-rule-solvers/implications.mjs';
import solverFork from './multi-rule-solvers/fork.mjs';

const solver = new Solver([
  //solverTrivial,
  //solverRegexp,
  //solverCaps,
  solverPerlRegexp,
  solverImplications(10),
  //solverFork,
]);

function run(gameFile) {
  const game = compileGame(JSON.parse(readFileSync(gameFile)));
  const state = makeState(game);

  const tmBegin = performance.now();
  let tmEnd;
  try {
    solver.solve(game.rules, state);
    tmEnd = performance.now();
    drawGameState(game, state);
  } catch (e) {
    tmEnd = performance.now();
    if (e instanceof AmbiguousError) {
      process.stderr.write('Multiple solutions found. Examples (there may be more):\n\n');
      for (const exampleState of e.exampleStates) {
        drawGameState(game, exampleState);
        process.stderr.write('\n');
      }
      process.stderr.write('Solution before uncertainty:\n\n');
      drawGameState(game, state);
    } else if (e instanceof StuckError) {
      process.stderr.write('Stuck while solving with currently configured methods:\n\n');
      drawGameState(game, state);
    } else {
      process.stderr.write(`${e}\n`);
    }
  }

  process.stdout.write(`\n`);
  process.stdout.write(`Short image: ${toShortByImage(game, state)}\n`);
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
