#!/usr/bin/env node

import { readFileSync } from 'node:fs';

import { compileGame, extractRules } from '../src/game.mjs';
import { UNKNOWN } from '../src/constants.mjs';
import { toShortByImage, toShortByRules } from '../src/export.mjs';
import { solver } from '../src/solver/solver.mjs';
import { implications } from '../src/solver/methods/implications.mjs';
import { fork } from '../src/solver/methods/fork.mjs';
import { isolatedRules } from '../src/solver/methods/isolated-rules.mjs';
import { perlRegexp } from '../src/solver/methods/isolated-rules/perl-regexp.mjs';

const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

let totalRules = 0;
let totalImage = 0;
let total = 0;

function run(gameFile) {
  const rules = extractRules(JSON.parse(readFileSync(gameFile)));
  const game = compileGame(rules);
  const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

  const compressedRules = toShortByRules(game);
  fastSolver(game.rules).solve(board);
  const compressedImage = toShortByImage(game, board);

  totalRules += compressedRules.length;
  totalImage += compressedImage.length;
  ++total;

  process.stdout.write(`- rules: ${compressedRules}\n`);
  process.stdout.write(`- image: ${compressedImage}\n`);
}

for (let i = 2; i < process.argv.length; ++ i) {
  const gameFile = process.argv[i];
  process.stdout.write(`${gameFile}:\n`);
  try {
    run(gameFile);
  } catch (e) {
    process.stdout.write(`- error: ${e}\n`);
  }
}

process.stdout.write('\nTotals:\n');
process.stdout.write(`- count: ${total}\n`);
process.stdout.write(`- rules: ${totalRules} (${(totalRules / total).toFixed(1)})\n`);
process.stdout.write(`- image: ${totalImage} (${(totalImage / total).toFixed(1)})\n`);
