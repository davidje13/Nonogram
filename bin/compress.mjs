#!/usr/bin/env node

import { readInputRules } from './input.mjs';
import { compileGame } from '../src/game.mjs';
import { UNKNOWN } from '../src/constants.mjs';
import { compressImage } from '../src/export/image.mjs';
import { compressRules } from '../src/export/rules.mjs';
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

for (const { name, rules } of readInputRules()) {
  try {
    process.stdout.write(`\nCompressing ${name}\n`);
    const game = compileGame(rules);
    const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

    const compressedRules = compressRules(game);
    fastSolver(game.rules).solve(board);
    const compressedImage = compressImage({ width: game.w, height: game.h, data: board });

    totalRules += compressedRules.length;
    totalImage += compressedImage.length;
    ++total;

    process.stdout.write(`- rules: ${compressedRules}\n`);
    process.stdout.write(`- image: ${compressedImage}\n`);
  } catch (e) {
    process.stdout.write(`- error: ${e}\n`);
  }
}

process.stdout.write('\nTotals:\n');
process.stdout.write(`- count: ${total}\n`);
process.stdout.write(`- rules: ${totalRules} (${(totalRules / total).toFixed(1)})\n`);
process.stdout.write(`- image: ${totalImage} (${(totalImage / total).toFixed(1)})\n`);
