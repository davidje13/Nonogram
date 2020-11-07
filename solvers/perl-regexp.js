const { UNKNOWN, OFF, ON } = require('../constants.js');

const GAP = { match: [UNKNOWN, OFF], result: OFF, next: [0, 1] };
const END = { match: [], next: [] };

function addStates(target, parts, partIndex) {
  parts[partIndex].next.forEach((n) => {
    const targetIndex = partIndex + n;
    let v = target.get(targetIndex);
    if (!v) {
      v = [];
      target.set(targetIndex, v);
    }
    v.push(partIndex);
  });
}

module.exports = {
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
    return parts;
  },
  run(parts, substate) {
    const posStates = [];
    let nextStates = new Map();
    addStates(nextStates, parts, 0);
    for (let i = 0; i < substate.length; ++ i) {
      const v = substate[i];
      const posState = new Map();
      const curStates = nextStates;
      nextStates = new Map();
      curStates.forEach((sources, stateIndex) => {
        const part = parts[stateIndex];
        if (part.match.includes(v)) {
          posState.set(stateIndex, sources);
          addStates(nextStates, parts, stateIndex);
        }
      });
      posStates.push(posState);
    }
    const successfulEndSources = nextStates.get(parts.length - 1);
    if (!successfulEndSources) {
      throw new Error(`failed to find match when checking '${substate}' (${parts})`);
    }
    let nextSources = new Set(successfulEndSources);
    for (let i = substate.length; (i --) > 0; ) {
      const possible = new Set();
      const curSources = nextSources;
      nextSources = new Set();
      for (const prevIndex of curSources) {
        possible.add(parts[prevIndex].result);
        posStates[i].get(prevIndex).forEach((index) => nextSources.add(index));
      }
      if (possible.size === 1) {
        substate[i] = [...possible][0];
      }
    }
  },
};
