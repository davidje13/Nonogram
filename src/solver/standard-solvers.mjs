import { solver } from './solver.mjs';
import { implications } from './methods/implications.mjs';
import { fork } from './methods/fork.mjs';
import { isolatedRules } from './methods/isolated-rules.mjs';
import { trivial } from './methods/isolated-rules/trivial.mjs';
import { regExp } from './methods/isolated-rules/regexp.mjs';
import { perlRegexp } from './methods/isolated-rules/perl-regexp.mjs';

// solves valid games as quickly as possible
export const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications({ maxComplexity: 2 }),
  fork({ parallel: false }),
);

// solves as much as possible of the game, even if ambiguous
export const thoroughSolver = solver(
  isolatedRules(perlRegexp),
  implications({ maxComplexity: 2 }),
  fork({ parallel: true }),
);

// solves "like a human", prefering simple easy-to-understand methods where possible, with difficulty ratings for each move
export const hintSolver = solver(
  isolatedRules(trivial, { baseDifficulty: 0, tedium: 1 }),
  isolatedRules(regExp, { baseDifficulty: 1, tedium: 2 }),
  isolatedRules(perlRegexp, { baseDifficulty: 5, tedium: 3 }),
  implications({ baseDifficulty: 20, tedium: 10 }),
  fork({ parallel: false, fastSolve: false, baseDifficulty: 100, baseTedium: 4 }),
);
