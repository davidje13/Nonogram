import { UNKNOWN, ON } from './constants.mjs';

function toBase64Url(base64) {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

class BitEncoder {
  constructor() {
    this.bytes = [];
    this.cur = 0;
    this.bit = 0;
  }

  toBase64() {
    if (this.bit & 0x7) {
      this.bytes.push(this.cur);
    }
    return toBase64Url(Buffer.from(this.bytes).toString('base64'));
  }

  writeBit(value) {
    if (value) {
      this.cur |= (0x80 >> (this.bit & 7));
    }
    if (!((++ this.bit) & 0x7)) {
      this.bytes.push(this.cur);
      this.cur = 0;
    }
  }

  writeUnary(value) {
    for (let i = 0; i < value; ++ i) {
      this.writeBit(true);
    }
    this.writeBit(false);
  }

  writeBinary(bits, value) {
    let mask = 1 << (bits - 1);
    for (let i = 0; i < bits; ++ i) {
      this.writeBit(value & mask);
      mask >>= 1;
    }
  }

  writeUnbounded(value) {
    let blockStart = 0;
    let blockLen = 1;
    while (true) {
      const next = blockStart + (1 << blockLen);
      if (next > value) {
        break;
      }
      blockStart = next;
      ++ blockLen;
    }
    this.writeUnary(blockLen - 1);
    this.writeBinary(blockLen, value - blockStart);
  }
}

function encodeRules(encoder, rules, limit) {
  for (const rule of rules) {
    if (!rule) {
      encoder.writeUnbounded(limit + 1);
      continue;
    }
    let len = 0;
    for (const v of rule) {
      encoder.writeUnbounded(v);
      len += v + 1;
    }
    if (len < limit) {
      encoder.writeUnbounded(0);
    }
  }
}

export function toJSON(game) {
  return JSON.stringify({
    rows: game.rows,
    cols: game.cols,
  });
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
  return encoder.toBase64();
}

export function toShortByRules({ rows, cols }) {
  const encoder = new BitEncoder();
  encoder.writeUnbounded(cols.length);
  encoder.writeUnbounded(rows.length);
  encodeRules(encoder, rows, cols.length);
  encodeRules(encoder, cols, rows.length);
  return encoder.toBase64();
}
