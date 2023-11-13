import { stateFromString, stateToString1D } from '../debug.mjs';
import solverCaps from './caps.mjs';

describe('solverCaps', () => {
  it('marks end caps of blocks which cannot be longer', ({ rule, input, expected }) => {
    const pattern = solverCaps.compile(rule);
    const state = stateFromString(input);
    solverCaps.run(pattern, state);
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
