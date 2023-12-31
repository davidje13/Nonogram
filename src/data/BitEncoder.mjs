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
    this.writeBits(huffman.write(value));
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

    this.writeUnary(index);
    this.writeBinary(value - start, index + 1);
  }
}
