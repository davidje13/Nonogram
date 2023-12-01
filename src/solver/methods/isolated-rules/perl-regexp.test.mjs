import { boardLineFromString, boardLineToString } from '../../test-utils/conversion.mjs';
import { perlRegexp } from './perl-regexp.mjs';

describe('perlRegexp', () => {
  it('solves as much of a single line as possible', ({ rule, input, expected }) => {
    const boardLine = boardLineFromString(input);
    perlRegexp(rule)(boardLine);
    expect(boardLineToString(boardLine)).equals(expected);
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
});
