const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export class BitEncoder {
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

  writeBits(value) {
    for (const bit of value) {
      this.writeBit(bit);
    }
  }

  pad() {
    if (this.bit !== 0b00100000) {
      this.sextets.push(B64[this.cur]);
      this.cur = 0;
      this.bit = 0b00100000;
    }
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

  writeExpGolomb(value, k = 0) {
    const a = (value >>> k) + 1;
    const bits = bitLength(a);
    for (let i = 0; i < bits - 1; ++ i) {
      this.writeBit(0);
    }
    this.writeBinary(a, bits);
    if (k) {
      this.writeBinary(value & ((1 << k) - 1), k);
    }
  }
}

function bitLength(v) {
  let n = 0;
  for (; v; v >>>= 1) {
    ++n;
  }
  return n;
}
