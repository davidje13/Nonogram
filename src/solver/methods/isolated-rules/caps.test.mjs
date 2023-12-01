import { boardLineFromString, boardLineToString } from '../../test-utils/conversion.mjs';
import { caps } from './caps.mjs';

describe('caps', () => {
  it('marks end caps of blocks which cannot be longer', ({ rule, input, expected }) => {
    const boardLine = boardLineFromString(input);
    caps(rule)(boardLine);
    expect(boardLineToString(boardLine)).equals(expected);
  }, { parameters: [
    { rule: [3], input: '--###--', expected: '  ###  ' },
    { rule: [3, 1], input: '--###--', expected: '- ### -' }, // full solution: '  ### -'
    { rule: [3, 4], input: '--###---####--', expected: '  ###   ####  ' },
    { rule: [1, 3, 1, 4], input: '--###---####--', expected: '- ### - #### -' }, // full solution: '- ### - ####  '
    { rule: [1, 4, 2], input: '------##--##-', expected: '------##--##-' }, // full solution: '-----###- ## '
    { rule: [1, 4, 2], input: '----####--##-', expected: '--- ####  ## ' },
    { rule: [1, 4, 2], input: '#---####--##-', expected: '#   ####  ## ' },
  ] });
});
