import { solver } from './solver.mjs';
import { implications } from './methods/implications.mjs';
import { fork } from './methods/fork.mjs';
import { isolatedRules } from './methods/isolated-rules.mjs';
import { trivial } from './methods/isolated-rules/trivial.mjs';
import { regExp } from './methods/isolated-rules/regexp.mjs';
import { perlRegexp } from './methods/isolated-rules/perl-regexp.mjs';

export const fastSolver = solver(
  isolatedRules(perlRegexp),
  implications(),
  fork({ parallel: false }),
);

export const hintSolver = solver(
  isolatedRules(trivial, { baseDifficulty: 0, tedium: 1 }),
  isolatedRules(regExp, { baseDifficulty: 1, tedium: 2 }),
  isolatedRules(perlRegexp, { baseDifficulty: 5, tedium: 3 }),
  implications({ baseDifficulty: 20, tedium: 10 }),
  fork({ parallel: false, maxDepth: 5, fastSolve: false, baseDifficulty: 100, baseTedium: 2 }),
  fork({ parallel: false, baseDifficulty: 100, baseTedium: 4 }),
);
