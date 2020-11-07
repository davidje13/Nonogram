#!/usr/bin/env node

const fs = require('fs');

const { drawGameState } = require('./draw.js');
const { compileGame } = require('./game.js');
const { makeState } = require('./state.js');
const Solver = require('./Solver.js');
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
  process.stderr.write(`${e}\n\n`);
}

drawGameState(game, state);
