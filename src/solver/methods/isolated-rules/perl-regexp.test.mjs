import { compileGame } from '../../../game.mjs';
import { makeState } from '../../../state.mjs';
import { stateFromString, stateToString, stateToString1D } from '../../../debug.mjs';
import { solver } from '../../solver.mjs';
import { isolatedRules } from '../isolated-rules.mjs';
import wellDefinedGames from '../../../test-games/well-defined.mjs';
import { perlRegexp } from './perl-regexp.mjs';

describe('perlRegexp', () => {
  it('solves as much of a single line as possible', ({ rule, input, expected }) => {
    const state = stateFromString(input);
    perlRegexp(rule)(state);
    expect(stateToString1D(state)).equals(expected);
  }, { parameters: [
    { rule: [], input: '----', expected: '    ' },
    { rule: [4], input: '----', expected: '####' },
    { rule: [3], input: '----', expected: '-##-' },
    { rule: [2], input: '----', expected: '----' },
    { rule: [2, 1], input: '----', expected: '## #' },
    { rule: [1, 1], input: '----', expected: '----' },
    { rule: [3], input: '-----', expected: '--#--' },
    { rule: [2, 2], input: '-----', expected: '## ##' },
    { rule: [2, 1], input: '-----', expected: '-#---' },
    { rule: [1, 2], input: '-----', expected: '---#-' },
    { rule: [3, 4], input: '--------', expected: '### ####' },
    { rule: [3, 4], input: '---------', expected: '-##--###-' },
    { rule: [3, 4], input: '----------', expected: '--#---##--' },
    { rule: [3, 4], input: '-----------', expected: '-------#---' },
    { rule: [3, 4], input: '------------', expected: '------------' },
    { rule: [3], input: '---- ', expected: '-##- ' },
    { rule: [3], input: '--- -', expected: '###  ' },
    { rule: [3], input: '- ---', expected: '  ###' },
    { rule: [2], input: '- ---- -', expected: '  ----  ' },
    { rule: [3], input: '- --- -- --', expected: '  ###      ' },
    { rule: [3], input: '- --- - ---', expected: '  ---   ---' },
    { rule: [2], input: '#------', expected: '##     ' },
    { rule: [2], input: '---#---', expected: '  -#-  ' },
    { rule: [2], input: '------#', expected: '     ##' },
    { rule: [4, 1], input: '#------', expected: '#### --' },
    { rule: [4, 1], input: '-#-----', expected: '-###---' },
    { rule: [4, 1], input: '--#----', expected: '-###---' },
    { rule: [4, 1], input: '---#---', expected: '-###---' },
    { rule: [4, 1], input: '----#--', expected: ' #### #' },
    { rule: [4, 1], input: '-----#-', expected: '#### # ' },
    { rule: [4, 1], input: '------#', expected: '-###- #' },
    { rule: [2, 1], input: '#------', expected: '## ----' },
    { rule: [2, 2], input: '------#', expected: '---- ##' },
    { rule: [3, 2], input: '------#', expected: '-##- ##' },
    { rule: [3, 1], input: '---##---', expected: '  -##---' },
    { rule: [1, 3], input: '---##---', expected: '---##-  ' },
    { rule: [1, 3, 1], input: '---##---', expected: '---##---' },
    { rule: [3, 1], input: '------##--', expected: '     ### #' },
    { rule: [3, 3], input: '------# ---', expected: '--- ### ---' },
  ] });

  it('solves well defined games', ({ rows, cols, image }) => {
    const perlRegexpSolver = solver(isolatedRules(perlRegexp));
    const game = compileGame({ rows, cols });
    const state = makeState(game);

    perlRegexpSolver(game.rules).solve(state);
    expect(stateToString(game, state)).equals(image.join('\n'));
  }, { parameters: wellDefinedGames });
});
