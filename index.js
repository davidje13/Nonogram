#!/usr/bin/env node

const fs = require('fs');
const { performance } = require('perf_hooks');

const { drawGameState } = require('./draw.js');
const { compileGame } = require('./game.js');
const { makeState } = require('./state.js');
const Solver = require('./Solver.js');
const AmbiguousError = require('./AmbiguousError.js');
const { toShortByImage, toShortByRules } = require('./export.js');
const solverTrivial = require('./solvers/trivial.js');
const solverRegexp = require('./solvers/regexp.js');
const solverPerlRegexp = require('./solvers/perl-regexp.js');
const solverCaps = require('./solvers/caps.js');

const solver = new Solver([
  //solverTrivial,
  //solverRegexp,
  //solverCaps,
  solverPerlRegexp,
]);

const gameFile = process.argv[2] || process.stdin.fd;
const game = compileGame(JSON.parse(fs.readFileSync(gameFile)));
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
  } else {
    process.stderr.write(`${e}\n`);
  }
}

process.stdout.write(`\n`);
process.stdout.write(`Short image: ${toShortByImage(game, state)}\n`);
process.stdout.write(`Short rules: ${toShortByRules(game)}\n`);
process.stdout.write(`Solving time: ${(tmEnd - tmBegin).toFixed(1)}ms\n`);
