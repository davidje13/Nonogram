/**
 * Combines probabilities from independent observations of the same event.
 */
function combineP(p1, p2) {
  // this equation is derived from taking the 2x2 probability table of p1 & p2,
  // and removing the impossible cases (outcome 1 != outcome 2)
  return (p1 * p2) / (1 - p1 - p2 + 2 * p1 * p2);
}

export class GridPreview {
  constructor(rules = { rows: [[]], cols: [[]] }) {
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

    const xDensity = rules.cols.map((rule) => rule.reduce((a, b) => a + b, 0) / h);
    const yDensity = rules.rows.map((rule) => rule.reduce((a, b) => a + b, 0) / w);

    const dat = this.ctx.createImageData(w, h);
    for (let y = 0; y < h; ++y) {
      for (let x = 0; x < w; ++x) {
        const p = combineP(xDensity[x], yDensity[y]);
        dat.data[(y * w + x) * 4 + 3] = (p * 255 + 0.5)|0;
      }
    }
    this.ctx.putImageData(dat, 0, 0);
  }
}
