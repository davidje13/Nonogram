import { UNKNOWN, OFF, ON, UNKNOWABLE } from '../constants.mjs';
import { BitDecoder } from '../data/BitDecoder.mjs';
import { BitEncoder } from '../data/BitEncoder.mjs';
import { ExpGolomb } from '../data/ExpGolomb.mjs';
import { writeSize, readSize, pickShortest, getLowBiasedHuffman } from './common.mjs';

const imageRunFormat = new ExpGolomb(1);
const symbols = [UNKNOWN, OFF, ON];

function compressImageL({ width, height, exists, alphabet, mapped }) {
  const size = width * height;

  const encoder = new BitEncoder();
  writeSize(encoder, width, height);
  encoder.writeBits(exists);
  for (let i = 0, previous = null; i < size;) {
    const v = mapped[i];
    const huff = getLowBiasedHuffman(alphabet.length - (previous === null ? 1 : 2));
    let index = 0;
    for (let j = 0; alphabet[j] !== v; ++j) {
      index += (alphabet[j] !== previous) ? 1 : 0;
    }
    huff.write(encoder, index);
    let run = 1;
    while (i + run < size && mapped[i + run] === v) {
      ++run;
    }
    imageRunFormat.write(encoder, run - 1);
    previous = v;
    i += run;
  }

  return `L${encoder}`;
}

export function decompressImageL(decoder) {
  const { width, height } = readSize(decoder);
  const size = width * height;
  const data = new Uint8Array(size);
  const exists = decoder.readBits(symbols.length);
  const alphabet = symbols.filter((_, i) => exists[i]);
  for (let i = 0, previous = null; i < size;) {
    const huff = getLowBiasedHuffman(alphabet.length - (previous === null ? 1 : 2));
    const hIndex = huff.read(decoder);
    const index = hIndex + ((previous !== null && hIndex >= previous) ? 1 : 0);
    const v = alphabet[index];
    const runTo = i + imageRunFormat.read(decoder) + 1;
    if (runTo > size) {
      throw new Error('invalid run');
    }
    for (; i < runTo; ++i) {
      data[i] = v;
    }
    previous = index;
  }
  return { width, height, data };
}

function compressImageB({ width, height, exists, alphabet, mapped }) {
  if (alphabet.length !== 2) {
    return null;
  }
  const encoder = new BitEncoder();
  writeSize(encoder, width, height);
  getLowBiasedHuffman(3).write(encoder, exists.indexOf(false));
  for (let i = 0; i < width * height; ++i) {
    encoder.writeBit(alphabet.indexOf(mapped[i]));
  }
  return `B${encoder}`;
}
compressImageB.minEstimate = ({ width, height }) => 1 + (width * height) / 6;

export function decompressImageB(decoder) {
  const { width, height } = readSize(decoder);
  const skip = getLowBiasedHuffman(3).read(decoder);
  const alphabet = symbols.filter((_, i) => i !== skip);
  const data = new Uint8Array(width * height);
  for (let i = 0; i < width * height; ++i) {
    data[i] = alphabet[decoder.readBit() ? 1 : 0];
  }
  return { width, height, data };
}

export function compressImage({ width, height, data }) {
  const size = width * height;

  const mapped = new Uint8Array(size);
  for (let i = 0; i < size; ++i) {
    mapped[i] = data[i] === UNKNOWABLE ? UNKNOWN : data[i];
  }

  const exists = symbols.map((v) => mapped.includes(v));
  const alphabet = symbols.filter((_, i) => exists[i]);
  if (alphabet.length === 0) {
    throw new Error('unknown board symbols');
  }

  return pickShortest(
    [compressImageL, compressImageB],
    { width, height, exists, alphabet, mapped },
  );
}

export function decompressImage(compressed) {
  const decoder = new BitDecoder(compressed.substring(1));
  if (compressed[0] === 'L') {
    return decompressImageL(decoder);
  } else if (compressed[0] === 'B') {
    return decompressImageB(decoder);
  } else {
    throw new Error('unknown image compression');
  }
}
