import { compileGame } from '../../game.mjs';
import { UNKNOWN } from '../../constants.mjs';
import { solver } from '../solver.mjs';
import { boardToString } from '../test-utils/conversion.mjs';
import { ambiguousGames, trivialGames, wellDefinedGames } from '../test-utils/games.mjs';
import { trivial } from './isolated-rules/trivial.mjs';
import { perlRegexp } from './isolated-rules/perl-regexp.mjs';
import { isolatedRules } from './isolated-rules.mjs';

describe('isolated-rules', () => {
  it('solves trivial games with trivial', ({ rows, cols, image }) => {
    const trivialSolver = solver(isolatedRules(trivial));
    const game = compileGame({ rows, cols });
    const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

    trivialSolver(game.rules).solve(board);
    expect(boardToString(game, board)).equals(image.join('\n'));
  }, { parameters: trivialGames });

  it('solves well defined games with perl-regexp', ({ rows, cols, image }) => {
    const perlRegexpSolver = solver(isolatedRules(perlRegexp));
    const game = compileGame({ rows, cols });
    const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

    perlRegexpSolver(game.rules).solve(board);
    expect(boardToString(game, board)).equals(image.join('\n'));
  }, { parameters: [...trivialGames, ...wellDefinedGames] });

  it('gets stuck if game is ambiguous', ({ rows, cols, image, bestSolution }) => {
    const perlRegexpSolver = solver(isolatedRules(perlRegexp));
    const game = compileGame({ rows, cols });
    const board = new Uint8Array(game.w * game.h).fill(UNKNOWN);

    expect(() => perlRegexpSolver(game.rules).solve(board)).throws('unable to solve game with configured methods');
    expect(boardToString(game, board)).equals(bestSolution.join('\n'));
  }, { parameters: ambiguousGames });
});
