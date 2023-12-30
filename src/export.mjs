import { UNKNOWN, ON } from './constants.mjs';
import { Huffman, Rational } from './huffman.mjs';

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

class BitEncoder {
  constructor() {
    this.sextets = [];
    this.cur = 0;
    this.bit = 0b00100000;
  }

  length() {
    return this.sextets.length + (this.bit !== 0b00100000 ? 1 : 0);
  }

  toString() {
    this.pad();
    return this.sextets.join('');
  }

  writeBit(value) {
    if (value) {
      this.cur |= this.bit;
    }
    this.bit >>>= 1;
    if (!this.bit) {
      this.sextets.push(B64[this.cur]);
      this.cur = 0;
      this.bit = 0b00100000;
    }
  }

  pad() {
    if (this.bit !== 0b00100000) {
      this.sextets.push(B64[this.cur]);
      this.cur = 0;
      this.bit = 0b00100000;
    }
  }

  writeUnary(value) {
    if (value < 0) {
      throw new Error(`value ${value} out of bounds (unsigned unary)`);
    }
    for (let i = 0; i < value; ++ i) {
      this.writeBit(true);
    }
    this.writeBit(false);
  }

  writeBinary(value, bits) {
    if (value < 0 || value >= (1 << bits)) {
      throw new Error(`value ${value} out of bounds (${bits}-bit unsigned)`);
    }
    let mask = 1 << (bits - 1);
    for (let i = 0; i < bits; ++ i) {
      this.writeBit(value & mask);
      mask >>= 1;
    }
  }

  writeHuffman(value, huffman) {
    for (const bit of huffman.write(value)) {
      this.writeBit(bit);
    }
  }

  writeUnbounded(value) {
    // approximates to an infinite huffman code with weights (i+2)^-2
    //  0=00
    //  1=01
    //  2=1000
    //  3=1001
    //  4=1010
    //  5=1011
    //  6=110000
    //  7=110001
    //  8=110010
    //  9=110011
    // 10=110100
    // 11=110101
    // 12=110110
    // 13=110111
    // 14=11100000
    const block = findUnboundedBlock(value);
    this.writeUnary(block.index);
    this.writeBinary(value - block.start, block.bits);
  }
}

function findUnboundedBlock(value) {
  let start = 0;
  let index = 0;
  while (true) {
    const next = start + (2 << index);
    if (next > value) {
      break;
    }
    start = next;
    ++ index;
  }
  return { index, start, end: start + (2 << index) - 1, bits: index + 1 };
}

const HUFFMAN_CACHE = new Map();

function getLowBiasedHuffman(limit) {
  if (limit < 0) {
    throw new Error(`invalid huffman limit: ${limit}`);
  }
  if (!HUFFMAN_CACHE.has(limit)) {
    const symbols = [];
    for (let i = 0; i <= limit; ++i) {
      // (i+2)^-2 is closer to the unbounded distribution, but (i+2)^-1 gives better results here experimentally
      symbols.push({ value: i, p: new Rational(1, i + 2) });
    }
    HUFFMAN_CACHE.set(limit, new Huffman(symbols));
  }
  return HUFFMAN_CACHE.get(limit);
}

function encodeRule(encoder, rule, limit) {
  let remaining = rule?.reduce((a, b) => a + b, 0) ?? limit + 1;
  encoder.writeHuffman(remaining, getLowBiasedHuffman(limit + 1));
  const cap = Math.min(rule?.length ?? 0, limit - remaining);
  for (let i = 0; i < cap; ++i) {
    encoder.writeHuffman(rule[i] - 1, getLowBiasedHuffman(remaining - 1));
    remaining -= rule[i];
  }
}

function encodeRules(encoder, rules, limit) {
  for (const rule of rules) {
    encodeRule(encoder, rule, limit);
  }
}

export function toShortByImage({ w, h }, board) {
  const encoder = new BitEncoder();
  encoder.writeUnbounded(w);
  encoder.writeUnbounded(h);
  for (let y = 0; y < h; ++ y) {
    for (let x = 0; x < w; ++ x) {
      const c = board[y * w + x];
      if (c === UNKNOWN) {
        return null;
      }
      encoder.writeBit(c === ON);
    }
  }
  return `B${encoder}`;
}

export function toShortByRules({ rows, cols }) {
  const encoder = new BitEncoder();
  encoder.writeUnbounded(cols.length);
  encoder.writeUnbounded(rows.length);
  encodeRules(encoder, rows, cols.length);
  encodeRules(encoder, cols, rows.length);
  return `R${encoder}`;
}
