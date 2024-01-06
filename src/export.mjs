import { UNKNOWN, OFF, ON, UNKNOWABLE } from './constants.mjs';
import { BitEncoder } from './data/BitEncoder.mjs';
import { Huffman, Rational } from './data/huffman.mjs';

const HUFFMAN_CACHE = new Map();

function getLowBiasedHuffman(limit) {
  if (limit < 0) {
    throw new Error(`invalid huffman limit: ${limit}`);
  }
  if (!HUFFMAN_CACHE.has(limit)) {
    const symbols = [];
    for (let i = 0; i <= limit; ++i) {
      // (i+2)^-2 is closer to the unbounded distribution, but (i+2)^-1 gives better results here experimentally
      symbols.push([i, new Rational(1, i + 2)]);
    }
    HUFFMAN_CACHE.set(limit, Huffman.fromFrequencies(symbols));
  }
  return HUFFMAN_CACHE.get(limit);
}

function encodeRule(encoder, rule, limit) {
  if (!rule) {
    throw new Error('Cannot encode partial rules');
  }
  const total = rule.reduce((a, b) => a + b, 0);
  encoder.writeBits(getLowBiasedHuffman(limit).write(total));
  const cap = Math.min(rule.length, limit - total);
  for (let i = 0, remaining = total; i < cap; ++i) {
    encoder.writeBits(getLowBiasedHuffman(remaining - 1).write(rule[i] - 1));
    remaining -= rule[i];
  }
}

function encodeRules(encoder, rules, limit) {
  for (const rule of rules) {
    encodeRule(encoder, rule, limit);
  }
}

function writeSize(encoder, w, h) {
  encoder.writeExpGolomb(w, 4);
  encoder.writeExpGolomb(h, 4);
}

export function toShortByImage({ w, h }, board) {
  const size = w * h;

  const mapped = new Uint8Array(size);
  for (let i = 0; i < size; ++i) {
    mapped[i] = board[i] === UNKNOWABLE ? UNKNOWN : board[i];
  }

  const symbols = [UNKNOWN, OFF, ON];
  const exists = symbols.map((v) => mapped.includes(v));
  const alphabet = symbols.filter((_, i) => exists[i]);
  if (alphabet.length === 0) {
    throw new Error('unknown board symbols');
  }

  const encoder = new BitEncoder();
  writeSize(encoder, w, h);
  encoder.writeBits(exists);
  for (let i = 0, previous = null; i < size;) {
    const v = mapped[i];
    const huff = getLowBiasedHuffman(alphabet.length - (previous === null ? 1 : 2));
    let index = 0;
    for (let j = 0; alphabet[j] !== v; ++j) {
      index += (alphabet[j] !== previous) ? 1 : 0;
    }
    encoder.writeBits(huff.write(index));
    let run = 1;
    while (i + run < size && mapped[i + run] === v) {
      ++run;
    }
    encoder.writeExpGolomb(run - 1, 1);
    previous = v;
    i += run;
  }

  if (!mapped.includes(UNKNOWN)) {
    const encoder2 = new BitEncoder();
    writeSize(encoder2, w, h);
    for (let i = 0; i < w * h; ++i) {
      encoder2.writeBit(mapped[i] === ON);
    }
    if (encoder2.length() <= encoder.length()) {
      return `B${encoder2}`;
    }
  }
  return `L${encoder}`;
}

export function toShortByRules({ rows, cols }) {
  const encoder = new BitEncoder();
  writeSize(encoder, cols.length, rows.length);
  encodeRules(encoder, rows, cols.length);
  encodeRules(encoder, cols, rows.length);
  return `R${encoder}`;
}
