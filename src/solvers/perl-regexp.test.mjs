import { compileGame } from '../game.mjs';
import { makeState, toString } from '../state.mjs';
import { Solver } from '../Solver.mjs';
import wellDefinedGames from '../test-games/well-defined.mjs';
import solverPerlRegexp from './perl-regexp.mjs';

describe('solverPerlRegexp', () => {
  for (const data of wellDefinedGames) {
    it(`solves ${data.name}`, () => {
      const solver = new Solver([solverPerlRegexp]);
      const game = compileGame({ rows: data.rows, cols: data.cols });
      const state = makeState(game);

      solver.solve(game.rules, state);
      expect(toString(game, state)).equals(data.image.join('\n'));
    });
  }
});
