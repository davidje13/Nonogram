import { UNKNOWN, OFF, ON, UNKNOWABLE } from './constants.mjs';
import { BitEncoder } from './data/BitEncoder.mjs';
import { Huffman, Rational } from './data/huffman.mjs';
import { RUN, runLengthEncode } from './data/rle.mjs';

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

const COUNT_BITS = 2;
const MIN_RUN_LENGTH = 6;

function writeSize(encoder, w, h) {
  encoder.writeExpGolomb(w, 4);
  encoder.writeExpGolomb(h, 4);
}

export function toShortByImage({ w, h }, board) {
  const encoder = new BitEncoder();
  writeSize(encoder, w, h);

  const stream = runLengthEncode(
    board,
    MIN_RUN_LENGTH,
    (v) => v === UNKNOWABLE ? UNKNOWN : v,
  );

  const counts = new Map([[UNKNOWN, 0], [OFF, 0], [ON, 0], [RUN, 0]]);
  for (const value of stream) {
    counts.set(value.type, counts.get(value.type) + 1);
  }
  const maxCount = Math.max(...counts.values());
  const symbols = [];
  for (const [type, count] of counts.entries()) {
    let scaled = 0;
    if (count) {
      scaled = Math.max(Math.floor((count * ((1 << COUNT_BITS) - 1)) / maxCount), 1);
      symbols.push({ value: type, p: scaled });
    }
    encoder.writeBinary(scaled, COUNT_BITS);
  }
  const huffman = new Huffman(symbols);
  for (const value of stream) {
    encoder.writeBits(huffman.write(value.type));
    if (value.arg !== null) {
      encoder.writeExpGolomb(value.arg, 1);
    }
  }
  if (counts.get(UNKNOWN) === 0) {
    const encoder2 = new BitEncoder();
    writeSize(encoder2, w, h);
    for (let i = 0; i < w * h; ++i) {
      encoder2.writeBit(board[i] === ON);
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
