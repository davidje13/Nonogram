#!/usr/bin/env node

import { readInputRules } from './input.mjs';
import { compileGame } from '../src/game.mjs';
import { UNKNOWN } from '../src/constants.mjs';
import { compressImage } from '../src/export/image.mjs';
import { compressRules } from '../src/export/rules.mjs';
import { fastSolver } from '../src/solver/standard-solvers.mjs';

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
