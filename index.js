#!/usr/bin/env node

const fs = require('fs');

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

try {
  solver.solve(game.rules, state);
} catch (e) {
  if (e instanceof AmbiguousError) {
    process.stderr.write('Multiple solutions found. Examples (there may be more):\n\n');
    for (const exampleState of e.exampleStates) {
      drawGameState(game, exampleState);
      process.stderr.write('\n');
    }
    process.stderr.write('Solution before uncertainty:\n\n');
  } else {
    process.stderr.write(`${e}\n\n`);
  }
}

drawGameState(game, state);

process.stdout.write(`\n`);
process.stdout.write(`Short image: ${toShortByImage(game, state)}\n`);
process.stdout.write(`Short rules: ${toShortByRules(game)}\n`);
