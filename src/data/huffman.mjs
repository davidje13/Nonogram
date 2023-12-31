export class Huffman {
  constructor(symbols) {
    if (!symbols.length) {
      throw new Error('cannot build empty huffman tree');
    }
    const innerSymbols = symbols.map((s) => ({
      value: s.value,
      p: Rational.from(s.p),
      parent: null,
      bits: null,
    }));
    const queue = [...innerSymbols].sort((a, b) => b.p.compare(a.p)); // low p at end
    while (queue.length > 1) {
      const c2 = queue.pop();
      const c1 = queue.pop();
      const parent = { next: [c1, c2], p: c1.p.add(c2.p), parent: null };
      c1.parent = c2.parent = parent;
      // binary search for new location
      let p1 = 0;
      let p2 = queue.length;
      while (p2 > p1) {
        const p = (p1 + p2) >>> 1;
        if (queue[p].p.compare(parent.p) > 0) {
          p1 = p + 1;
        } else {
          p2 = p;
        }
      }
      queue.splice(p1, 0, parent);
    }
    this.root = queue[0];
    this.symbols = new Map();
    for (const symbol of innerSymbols) {
      this.symbols.set(symbol.value, symbol);
      const bits = [];
      for (let s = symbol; s.parent; s = s.parent) {
        bits.push(s.parent.next.indexOf(s));
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
      r.push(`${String(symbol.value).padStart(5, ' ')} => ${symbol.bits.join('') || '-'}`);
    }
    return r.join('\n');
  }
}

export class Rational {
  constructor(num, den = 1) {
    if (den < 0) {
      this.num = -num;
      this.den = -den;
    } else {
      this.num = num;
      this.den = den;
    }
    if (this.den > 1e5) {
      this.simplify();
    }
  }

  static from(v) {
    if (v instanceof Rational) {
      return v;
    } else if (typeof v === 'number') {
      return new Rational(v);
    } else {
      throw new Error(`invalid number ${v}`);
    }
  }

  simplify() {
    const d = gcd(this.num, this.den);
    this.num /= d;
    this.den /= d;
  }

  compare(b) {
    return this.num * b.den - b.num * this.den;
  }

  add(b) {
    return new Rational(this.num * b.den + b.num * this.den, this.den * b.den);
  }

  toString() {
    return `${this.num}/${this.den}`;
  }

  toNumber() {
    return this.num / this.den;
  }
}

function gcd(a, b) {
  while (b) {
    const t = b;
    b = a % b;
    a = t;
  }
  return a;
}
