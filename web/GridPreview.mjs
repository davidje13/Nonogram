export class GridPreview {
  constructor(rules = { rows: [[]], cols: [[]] }) {
    this.enhancementSteps = 2;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'grid-preview';
    this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: true });
    this.setRules(rules);
  }

  setRules(rules) {
    const w = rules.cols.length;
    const h = rules.rows.length;
    this.canvas.width = w;
    this.canvas.height = h;

    let nx = w;
    let ny = h;
    const xSums = rules.cols.map(sum);
    const ySums = rules.rows.map(sum);

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
