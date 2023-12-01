import { boardLineFromString, boardLineToString } from '../../test-utils/conversion.mjs';
import { trivial } from './trivial.mjs';

describe('trivial', () => {
  it('populates line-spanning rules', ({ rule, input, expected }) => {
    const boardLine = boardLineFromString(input);
    trivial(rule)(boardLine);
    expect(boardLineToString(boardLine)).equals(expected);
  }, { parameters: [
    { rule: [], input: '-----', expected: '     ' },
    { rule: [5], input: '-----', expected: '#####' },
    { rule: [3, 1], input: '-----', expected: '### #' },
    { rule: [1, 1, 1], input: '-----', expected: '# # #' },
    { rule: [2, 2], input: '-----', expected: '## ##' },
    { rule: [2, 1], input: '-----', expected: '-----' }, // full solution: '-#---'
    { rule: [2, 1], input: '#---#', expected: '#---#' }, // full solution: '##  #'
  ] });
});
