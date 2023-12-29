import { UNKNOWN, ON, OFF } from '../src/constants.mjs';

export class GridView extends EventTarget {
  constructor({ width = 0, height = 0, cellWidth, cellHeight, fill = UNKNOWN, getChange = () => null }) {
    super();
    this.w = 0;
    this.h = 0;
    this.cw = cellWidth;
    this.ch = cellHeight;
    this.getChange = getChange;
    this.border = 1;
    this.displayScale = 1;
    this.values = new Uint8Array(0);
    this.marked = new Uint8Array(0);
    this.tiles = [];

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'grid-view';
    this.canvas.width = this.cw;
    this.canvas.height = this.ch;
    this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: true });

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.cw, this.ch);
    this.tiles[ON] = this.ctx.getImageData(0, 0, this.cw, this.ch);

    this.ctx.fillStyle = '#EEEEEE';
    this.ctx.fillRect(0, 0, this.cw, this.ch);
    this.tiles[UNKNOWN] = this.ctx.getImageData(0, 0, this.cw, this.ch);

    this.ctx.strokeStyle = '#808080';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(this.cw * 0.25, this.ch * 0.25);
    this.ctx.lineTo(this.cw * 0.75, this.ch * 0.75);
    this.ctx.moveTo(this.cw * 0.25, this.ch * 0.75);
    this.ctx.lineTo(this.cw * 0.75, this.ch * 0.25);
    this.ctx.stroke();
    this.tiles[OFF] = this.ctx.getImageData(0, 0, this.cw, this.ch);

    this.dirty = true;
    this.resize({ width, height, fill });

    this.updating = null;
    this._md = this._md.bind(this);
    this._mm = this._mm.bind(this);
    this._mu = this._mu.bind(this);

    this.canvas.addEventListener('mousedown', this._md);
    this.canvas.addEventListener('contextmenu', this._prevent);
  }

  destroy() {
    this.canvas.removeEventListener('mousedown', this._md);
    this.canvas.removeEventListener('contextmenu', this._prevent);
    window.removeEventListener('mousemove', this._mm);
    window.removeEventListener('mouseup', this._mu);
  }

  _prevent(e) {
    e.preventDefault();
  }

  _getCell(e) {
    const bounds = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - bounds.left - this.border * 0.5) / (this.cw + this.border));
    const y = Math.floor((e.clientY - bounds.top - this.border * 0.5) / (this.ch + this.border));
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      return null;
    }
    return { x, y };
  }

  _md(e) {
    e.preventDefault();
    const c = this._getCell(e);
    if (!c) {
      return;
    }
    const updated = this.getChange(this.values[c.y * this.w + c.x], e.button > 0 || e.altKey);
    if (updated === undefined || updated === null) {
      return;
    }
    this.updating = updated;
    this._mm(e);
    window.addEventListener('mousemove', this._mm, { passive: true });
    window.addEventListener('mouseup', this._mu, { passive: true, once: true });
  }

  _mm(e) {
    const c = this._getCell(e);
    if (c) {
      this.setCell(c.x, c.y, this.updating);
    }
  }

  _mu(e) {
    this._mm(e);
    window.removeEventListener('mousemove', this._mm);
    window.removeEventListener('mouseup', this._mu);
  }

  getSize() {
    return { width: this.w, height: this.h };
  }

  getTotalCellSize() {
    return {
      width: (this.cw + this.border) * this.displayScale,
      height: (this.ch + this.border) * this.displayScale,
    };
  }

  fill(fill = UNKNOWN) {
    this.values.fill(fill);
    this.dispatchEvent(new CustomEvent('change', { detail: { width: this.w, height: this.h, values: this.values } }));
    this.dirty = true;
    Promise.resolve().then(() => this.draw());
  }

  setCell(x, y, value) {
    const p = y * this.w + x;
    if (this.values[p] !== value) {
      this.values[p] = value;
      this.dispatchEvent(new CustomEvent('change', { detail: { width: this.w, height: this.h, values: this.values, x, y } }));
      this.dirty = true;
      Promise.resolve().then(() => this.draw());
    }
  }

  clearMarked() {
    if (this.marked.includes(1)) {
      this.marked.fill(0);
      this.dirty = true;
      Promise.resolve().then(() => this.draw());
    }
  }

  setMarked(x, y, marked = true) {
    const p = y * this.w + x;
    const value = marked ? 1 : 0;
    if (this.marked[p] !== value) {
      this.marked[p] = value;
      this.dirty = true;
      Promise.resolve().then(() => this.draw());
    }
  }

  resize({ width = null, height = null, fill = UNKNOWN, dx = 0, dy = 0 }) {
    const oldW = this.w;
    const oldH = this.h;
    const oldValues = this.values;
    const oldMarked = this.marked;
    if (width < 0 || height < 0) {
      throw new Error('invalid size');
    }
    this.w = width ?? oldW;
    this.h = height ?? oldH;
    this.values = new Uint8Array(this.w * this.h);
    this.marked = new Uint8Array(this.w * this.h);
    for (let y = 0; y < this.h; ++y) {
      const oy = y - dy;
      if (oy >= 0 && oy < oldH) {
        for (let x = 0; x < this.w; ++x) {
          const ox = x - dx;
          if (ox >= 0 && ox < oldW) {
            this.values[y * this.w + x] = oldValues[oy * oldW + ox];
            this.marked[y * this.w + x] = oldMarked[oy * oldW + ox];
          } else {
            this.values[y * this.w + x] = fill;
            this.marked[y * this.w + x] = 0;
          }
        }
      } else {
        for (let x = 0; x < this.w; ++x) {
          this.values[y * this.w + x] = fill;
          this.marked[y * this.w + x] = 0;
        }
      }
    }
    const fullWidth = this.w * (this.cw + this.border) + this.border;
    const fullHeight = this.h * (this.ch + this.border) + this.border;
    this.canvas.width = fullWidth;
    this.canvas.height = fullHeight;
    this.canvas.style.width = `${fullWidth * this.displayScale}px`;
    this.canvas.style.height = `${fullHeight * this.displayScale}px`;
    this.dispatchEvent(new CustomEvent('change', { detail: { width: this.w, height: this.h, values: this.values } }));
    this.dirty = true;
    this.draw();
  }

  draw() {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;

    const { w, h, cw, ch, border } = this;

    this.ctx.fillStyle = '#C0C0C0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < h; ++y) {
      const yy = y * (ch + border) + border;
      for (let x = 0; x < w; ++x) {
        const state = this.values[y * w + x];
        const xx = x * (cw + border) + border;
        this.ctx.putImageData(this.tiles[state], xx, yy);
      }
    }

    const r = border * 0.5;
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = Math.max(r * 2, 3);
    for (let y = 0; y < h; ++y) {
      const yy = y * (ch + border) + border;
      for (let x = 0; x < w; ++x) {
        if (this.marked[y * w + x]) {
          const xx = x * (cw + border) + border;
          this.ctx.strokeRect(xx - r, yy - r, cw + r * 2, ch + r * 2);
        }
      }
    }
  }
}
