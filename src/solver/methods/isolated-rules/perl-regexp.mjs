import { UNKNOWN, OFF, ON } from '../../../constants.mjs';
import { InvalidGameError } from '../../errors.mjs';

const EMPTY = matcher([]);
const UNKNOWN_OR_OFF = matcher([UNKNOWN, OFF]);
const UNKNOWN_OR_ON = matcher([UNKNOWN, ON]);
const GAP = { match: UNKNOWN_OR_OFF, result: OFF, next: [0, 1] };
const END = { match: EMPTY, next: [] };

function matcher(values) {
  const r = [false, false, false];
  for (let i = 0; i < 3; ++i) {
    r[i] = values.includes(i);
  }
  return r;
}

function addMulti(target, keys, value) {
  keys.forEach((key) => {
    let v = target.get(key);
    if (!v) {
      v = [];
      target.set(key, v);
    }
    v.push(value);
  });
}

function buildPartGraph(parts) {
  // semi-deep clone
  const resolvedParts = parts.map((o) => ({ ...o }));
  // resolve relative references between parts
  const count = parts.length;
  for (let i = 0; i < count; ++ i) {
    resolvedParts[i].next = resolvedParts[i].next.map((delta) => resolvedParts[i + delta]);
  }
  return { first: resolvedParts[0], end: resolvedParts[count - 1] };
}

/**
 * The perlRegexp solver can solve all 1D states perfectly.
 *
 * It can solve most games, but occasionally needs assistance from a branching guess
 * when multiple rules must be combined to progress.
 */
export const perlRegexp = (rule) => {
  const parts = [
    { match: EMPTY, next: [1, 2] }, // first gap is optional
    GAP,
  ];
  for (const v of rule) {
    for (let i = 0; i < v; ++ i) {
      parts.push({ match: UNKNOWN_OR_ON, result: ON, next: [1] });
    }
    parts.push(GAP);
  }
  if (rule.length) {
    parts[parts.length - 2].next.push(2); // final gap is optional
  }
  parts.push(END);
  const { first, end } = buildPartGraph(parts);

  return (boardLine) => {
    let nextStates = new Map();
    addMulti(nextStates, first.next, null);
    for (let i = 0; i < boardLine.length; ++ i) {
      const v = boardLine[i];
      const curStates = nextStates;
      nextStates = new Map();
      curStates.forEach((sources, part) => {
        if (part.match[v]) {
          addMulti(nextStates, part.next, { sources, part });
        }
      });
    }
    const endStates = nextStates.get(end);
    if (!endStates) {
      throw new InvalidGameError(`no match for rule ${rule.join('/')} (line: "${[...boardLine].map((v) => v === ON ? '#' : v === OFF ? ' ' : '-').join('')}")`);
    }
    let nextSources = new Set(endStates);
    for (let i = boardLine.length; (i --) > 0; ) {
      const possible = new Set();
      const curSources = nextSources;
      nextSources = new Set();
      for (const prev of curSources) {
        possible.add(prev.part.result);
        for (const source of prev.sources) {
          nextSources.add(source);
        }
      }
      if (possible.size === 1) {
        boardLine[i] = possible.values().next().value;
      }
    }
  };
};
