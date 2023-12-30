export class Huffman {
  constructor(symbols) {
    if (!symbols.length) {
      throw new Error('cannot build empty huffman tree');
    }
    const queue = [...symbols].sort((a, b) => b.p - a.p); // low p at end
    while (queue.length > 1) {
      const c2 = queue.pop();
      const c1 = queue.pop();
      const parent = { next: [c1, c2], p: c1.p + c2.p, parent: null };
      c1.bit = 0;
      c2.bit = 1;
      c1.parent = c2.parent = parent;
      // binary search for new location
      let p1 = 0;
      let p2 = queue.length;
      while (p2 > p1) {
        const p = (p1 + p2) >>> 1;
        if (queue[p].p > parent.p) {
          p1 = p + 1;
        } else {
          p2 = p;
        }
      }
      queue.splice(p1, 0, parent);
    }
    this.root = queue[0];
    this.symbols = new Map();
    for (const symbol of symbols) {
      this.symbols.set(symbol.value, symbol);
      const bits = [];
      for (let s = symbol; s.parent; s = s.parent) {
        bits.push(s.bit);
      }
      symbol.bits = bits.reverse();
    }
  }

  write(value) {
    const symbol = this.symbols.get(value);
    if (!symbol) {
      throw new Error(`unknown symbol ${value}`);
    }
    return symbol.bits;
  }

  toString() {
    const r = [];
    for (const symbol of this.symbols.values()) {
      r.push(`${String(symbol.value).padStart(5, ' ')} (${symbol.p.toFixed(3)}) => ${symbol.bits.join('') || '-'}`);
    }
    return r.join('\n');
  }
}
