import { BitDecoder } from '../data/BitDecoder.mjs';
import { BitEncoder } from '../data/BitEncoder.mjs';
import { writeSize, readSize, getLowBiasedHuffman } from './common.mjs';

function compressRule(encoder, rule, limit) {
  if (!rule) {
    throw new Error('Cannot encode partial rules');
  }
  const total = rule.reduce((a, b) => a + b, 0);
  getLowBiasedHuffman(limit).write(encoder, total);
  const cap = Math.min(rule.length, limit - total);
  for (let i = 0, remaining = total; i < cap; ++i) {
    getLowBiasedHuffman(remaining - 1).write(encoder, rule[i] - 1);
    remaining -= rule[i];
  }
}

function decompressRule(decoder, limit) {
  let remaining = getLowBiasedHuffman(limit).read(decoder);
  const cap = limit - remaining;
  const rule = [];
  while (remaining > 0 && rule.length < cap) {
    const r = getLowBiasedHuffman(remaining - 1).read(decoder) + 1;
    remaining -= r;
    rule.push(r);
  }
  if (remaining > 0) {
    rule.push(remaining);
  }
  return rule;
}

export function compressRules({ rows, cols }) {
  const encoder = new BitEncoder();
  writeSize(encoder, cols.length, rows.length);
  for (const rule of rows) {
    compressRule(encoder, rule, cols.length);
  }
  for (const rule of cols) {
    compressRule(encoder, rule, rows.length);
  }
  return `R${encoder}`;
}

export function decompressRules(compressed) {
  if (compressed[0] !== 'R') {
    throw new Error('unknown rule compression');
  }
  const decoder = new BitDecoder(compressed.substring(1));
  const { width, height } = readSize(decoder);
  const rows = [];
  for (let i = 0; i < height; ++i) {
    rows.push(decompressRule(decoder, width));
  }
  const cols = [];
  for (let i = 0; i < width; ++i) {
    cols.push(decompressRule(decoder, height));
  }
  return { rows, cols };
}
