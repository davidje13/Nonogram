import { OFF, ON } from '../src/constants.mjs';
import { el } from './dom.mjs';

const CONTEXT_POOL = [];

function getContext() {
  if (CONTEXT_POOL.length) {
    return CONTEXT_POOL.pop();
  }
  const canvas = el('canvas');
  return canvas.getContext('2d', { alpha: true, willReadFrequently: false });
}

export class GridPreview {
  constructor(className = '') {
    this.enhancementSteps = 2;
    this.ctx = null;
    this.container = el('div', { 'class': className });
  }

  clear() {
    if (this.ctx) {
      this.ctx.canvas.width = 0;
      this.ctx.canvas.height = 0;
      this.ctx.canvas.remove();
      CONTEXT_POOL.push(this.ctx);
      this.ctx = null;
    }
  }

  _prepareCanvas(w, h) {
    if (!this.ctx) {
      this.ctx = getContext();
      this.container.append(this.ctx.canvas);
    }

    this.ctx.canvas.width = w;
    this.ctx.canvas.height = h;
    if (w > h) {
      this.ctx.canvas.style.width = '100%';
      this.ctx.canvas.style.height = 'auto';
    } else {
      this.ctx.canvas.style.width = 'auto';
      this.ctx.canvas.style.height = '100%';
    }
  }

  setRules({ rows, cols }) {
    const w = cols.length;
    const h = rows.length;
    this._prepareCanvas(w, h);
    this.ctx.canvas.className = 'fuzzy';

    let nx = w;
    let ny = h;
    const xSums = cols.map(sum);
    const ySums = rows.map(sum);

    const ps = [];
    for (let i = 0; i < w * h; ++i) {
      ps[i] = null;
    }
    for (let step = 0; step < this.enhancementSteps; ++step) {
      let change = false;
      for (let y = 0; y < h; ++y) {
        const d = ySums[y];
        if (d === 0 || d === nx) {
          const v = d > 0 ? 1 : 0;
          for (let x = 0; x < w; ++x) {
            if (xSums[x] !== null) {
              ps[y * w + x] = v;
              xSums[x] -= v;
            }
          }
          ySums[y] = null;
          --ny;
          change = true;
        }
      }
      for (let x = 0; x < w; ++x) {
        const d = xSums[x];
        if (d === 0 || d === ny) {
          const v = d > 0 ? 1 : 0;
          for (let y = 0; y < h; ++y) {
            if (ySums[y] !== null) {
              ps[y * w + x] = v;
              ySums[y] -= v;
            }
          }
          xSums[x] = null;
          --nx;
          change = true;
        }
      }
      if (!change) {
        break;
      }
    }
    const mx = 1 / nx;
    const my = 1 / ny;
    const dat = this.ctx.createImageData(w, h);
    for (let y = 0; y < h; ++y) {
      const sy = (ySums[y] ?? 0.5) * mx;
      for (let x = 0; x < w; ++x) {
        const p = y * w + x;
        const d = ps[p] ?? combineP((xSums[x] ?? 0.5) * my, sy);
        dat.data[p * 4 + 3] = (d * 255 + 0.5)|0;
      }
    }
    this.ctx.putImageData(dat, 0, 0);
  }

  setImage({ width, height, data }, binary = false) {
    this._prepareCanvas(width, height);
    this.ctx.canvas.className = 'image';

    const lookup = [];
    lookup[OFF] = 0;
    lookup[ON] = 255;
    const unknown = binary ? 0 : 64;

    const dat = this.ctx.createImageData(width, height);
    for (let y = 0; y < height; ++y) {
      for (let x = 0; x < width; ++x) {
        const p = y * width + x;
        dat.data[p * 4 + 3] = lookup[data[p]] ?? unknown;
      }
    }
    this.ctx.putImageData(dat, 0, 0);
  }
}

/**
 * Combines probabilities from independent observations of the same event.
 */
function combineP(p1, p2) {
  // this equation is derived from taking the 2x2 probability table of p1 & p2,
  // and removing the impossible cases (outcome 1 != outcome 2)
  return (p1 * p2) / (1 - p1 - p2 + 2 * p1 * p2);
}

const sum = (rule) => rule?.reduce((a, b) => a + b, 0) ?? null;
