import { stateFromString, stateToString1D } from '../../../debug.mjs';
import { regExp } from './regexp.mjs';

describe('regExp', () => {
  it('solves most types of single line', ({ rule, input, expected }) => {
    const state = stateFromString(input);
    regExp(rule)(state);
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
    { rule: [3], input: '- --- - ---', expected: '  --- - ---' }, // full solution: '  ---   ---'
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
    { rule: [3, 3], input: '------# ---', expected: '------# ---' }, // full solution: '--- ### ---'
  ] });
});
