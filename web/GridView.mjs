import { UNKNOWN, ON, OFF } from '../src/constants.mjs';

export class GridView extends EventTarget {
  constructor({ width, height, cellWidth, cellHeight, initial = UNKNOWN, getChange = () => null }) {
    super();
    this.w = width;
    this.h = height;
    this.cw = cellWidth;
    this.ch = cellHeight;
    this.getChange = getChange;
    this.border = 1;
    this.values = new Uint8Array(this.w * this.h).fill(initial);
    this.marked = new Uint8Array(this.w * this.h).fill(0);

    const fullWidth = this.w * (this.cw + this.border) + this.border;
    const fullHeight = this.h * (this.ch + this.border) + this.border;
    this.canvas = document.createElement('canvas');
    this.canvas.width = fullWidth;
    this.canvas.height = fullHeight;
    this.canvas.style.width = `${fullWidth}px`;
    this.canvas.style.height = `${fullHeight}px`;
    this.canvas.style.imageRendering = 'pixelated';
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.dirty = true;
    this.draw();

    this.updating = null;
    this._md = this._md.bind(this);
    this._mm = this._mm.bind(this);
    this._mu = this._mu.bind(this);

    this.canvas.addEventListener('mousedown', this._md, { passive: true });
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
    const x = Math.floor((e.clientX - bounds.left) / (this.cw + this.border));
    const y = Math.floor((e.clientY - bounds.top) / (this.ch + this.border));
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      return null;
    }
    return { x, y };
  }

  _md(e) {
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

  setCell(x, y, value) {
    const p = y * this.w + x;
    if (this.values[p] !== value) {
      this.values[p] = value;
      this.dispatchEvent(new CustomEvent('change', { detail: { width: this.w, height: this.h, values: this.values } }));
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

  draw() {
    if (!this.dirty) {
      return;
    }
    this.dirty = false;

    const { w, h, cw, ch, border } = this;

    this.ctx.strokeStyle = '#808080';
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 1;

    this.ctx.fillStyle = '#C0C0C0';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    for (let y = 0; y < h; ++y) {
      for (let x = 0; x < w; ++x) {
        const state = this.values[y * w + x];
        this.ctx.fillStyle = state === ON ? '#000000' : '#EEEEEE';
        const xx = x * (cw + border) + border;
        const yy = y * (ch + border) + border;
        this.ctx.fillRect(xx, yy, cw, ch);
        if (state === OFF) {
          this.ctx.beginPath();
          this.ctx.moveTo(xx + cw * 0.25, yy + cw * 0.25);
          this.ctx.lineTo(xx + cw * 0.75, yy + cw * 0.75);
          this.ctx.moveTo(xx + cw * 0.25, yy + cw * 0.75);
          this.ctx.lineTo(xx + cw * 0.75, yy + cw * 0.25);
          this.ctx.stroke();
        }
      }
    }
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = border + 2;
    for (let y = 0; y < h; ++y) {
      for (let x = 0; x < w; ++x) {
        if (this.marked[y * w + x]) {
          const xx = x * (cw + border) + 0.5;
          const yy = y * (ch + border) + 0.5;
          this.ctx.strokeRect(xx, yy, cw + border, ch + border);
        }
      }
    }
  }
}
