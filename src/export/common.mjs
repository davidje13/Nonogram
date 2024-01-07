import { ExpGolomb } from '../data/ExpGolomb.mjs';
import { Huffman, Rational } from '../data/Huffman.mjs';

const sizeFormat = new ExpGolomb(4);

export function writeSize(encoder, w, h) {
  sizeFormat.write(encoder, w);
  sizeFormat.write(encoder, h);
}

export function readSize(decoder) {
  const width = sizeFormat.read(decoder);
  const height = sizeFormat.read(decoder);
  return { width, height };
}

export function pickShortest(options, args) {
  let best = null;
  let bestL = Number.POSITIVE_INFINITY;
  for (const option of options) {
    if ((option.minEstimate?.(args) ?? 0) < bestL) {
      const encoded = option(args);
      if (encoded && encoded.length < bestL) {
        best = encoded;
        bestL = encoded.length;
      }
    }
  }
  if (!best) {
    throw new Error('failed to encode using any method');
  }
  return best;
}

export function getLowBiasedHuffman(limit) {
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

const HUFFMAN_CACHE = new Map();
