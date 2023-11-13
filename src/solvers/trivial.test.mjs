import { stateFromString, stateToString1D } from '../debug.mjs';
import solverTrivial from './trivial.mjs';

describe('solverTrivial', () => {
  it('populates line-spanning rules', ({ rule, input, expected }) => {
    const pattern = solverTrivial.compile(rule);
    const state = stateFromString(input);
    solverTrivial.run(pattern, state);
    expect(stateToString1D(state)).equals(expected);
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
