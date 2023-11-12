import { UNKNOWN, OFF, ON } from '../constants.mjs';

const GAP = { match: [UNKNOWN, OFF], result: OFF, next: [0, 1] };
const END = { match: [], next: [] };

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
  const resolvedParts = parts.map((o) => Object.assign({}, o));
  // resolve relative references between parts
  const count = parts.length;
  for (let i = 0; i < count; ++ i) {
    resolvedParts[i].next = resolvedParts[i].next.map((delta) => resolvedParts[i + delta]);
  }
  return { first: resolvedParts[0], end: resolvedParts[count - 1] };
}

export default {
  compile(rule) {
    const parts = [
      { match: [], next: [1, 2] }, // first gap is optional
      GAP,
    ];
    for (const v of rule) {
      for (let i = 0; i < v; ++ i) {
        parts.push({ match: [UNKNOWN, ON], result: ON, next: [1] });
      }
      parts.push(GAP);
    }
    if (rule.length) {
      parts[parts.length - 2].next.push(2); // final gap is optional
    }
    parts.push(END);

    return buildPartGraph(parts);
  },
  run({ first, end }, substate) {
    let nextStates = new Map();
    addMulti(nextStates, first.next, null);
    for (let i = 0; i < substate.length; ++ i) {
      const v = substate[i];
      const curStates = nextStates;
      nextStates = new Map();
      curStates.forEach((sources, part) => {
        if (part.match.includes(v)) {
          addMulti(nextStates, part.next, { sources, part });
        }
      });
    }
    const endStates = nextStates.get(end);
    if (!endStates) {
      throw new Error('failed to find match');
    }
    let nextSources = new Set(endStates);
    for (let i = substate.length; (i --) > 0; ) {
      const possible = new Set();
      const curSources = nextSources;
      nextSources = new Set();
      for (const prev of curSources) {
        possible.add(prev.part.result);
        prev.sources.forEach((source) => nextSources.add(source));
      }
      if (possible.size === 1) {
        substate[i] = [...possible][0];
      }
    }
  },
};
