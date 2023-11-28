import { stateFromString, stateToString1D } from '../../../debug.mjs';
import { caps } from './caps.mjs';

describe('caps', () => {
  it('marks end caps of blocks which cannot be longer', ({ rule, input, expected }) => {
    const state = stateFromString(input);
    caps(rule)(state);
    expect(stateToString1D(state)).equals(expected);
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
