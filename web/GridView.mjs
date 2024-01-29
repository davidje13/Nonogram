import { UNKNOWN, ON, OFF } from '../src/constants.mjs';
import { el } from './dom.mjs';

const cBackOff = '#FFFFFF';
const cBackOn = '#222222';
const cCross = '#808080';
const cGridOffMinor = '#DDDDDD';
const cGridOffMajor = '#444444';
const gGridOnOverlay = '#444444';

export class GridView extends EventTarget {
  constructor({ width = 0, height = 0, majorX = 5, majorY = 5, cellWidth, cellHeight, border = 1, outerBorder = 1, fill = UNKNOWN, getChange = () => null }) {
    super();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = 0;
    this.h = 0;
    this.lastw = -1;
    this.lasth = -1;
    this.cw = cellWidth * this.dpr;
    this.ch = cellHeight * this.dpr;
    this.getChange = getChange;
    this.border = border * this.dpr;
    this.outerBorder = outerBorder * this.dpr;
    this.majorX = majorX;
    this.majorY = majorY;
    this.values = new Uint8Array(0);
    this.marks = [];
    this.tiles = null;
    this.dirty = false;
    this._readonly = false;
    this.updating = null;

    this.canvas = el('canvas', { 'class': 'grid-view' });
    this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: false });

    this._md = this._md.bind(this);
    this._mm = this._mm.bind(this);
    this._mu = this._mu.bind(this);
    this._mc = this._mc.bind(this);

    this.canvas.addEventListener('pointerdown', this._md, { passive: false });
    this.canvas.addEventListener('contextmenu', this._prevent, { passive: false });

    this.resize({ width, height, fill });
  }

  _removePointerEvents() {
    if (this.updating) {
      window.removeEventListener('pointermove', this._mm);
      window.removeEventListener('pointerup', this._mu);
      window.removeEventListener('pointercancel', this._mc);
      this.canvas.releasePointerCapture(this.updating.pointer);
      this.updating = null;
    }
  }

  destroy() {
    this.dirty = false;
    this.canvas.removeEventListener('pointerdown', this._md);
    this.canvas.removeEventListener('contextmenu', this._prevent);
    this._removePointerEvents();
  }

  setReadOnly(readonly = true) {
    if (readonly && !this._readonly) {
      this._removePointerEvents();
    }
    this._readonly = readonly;
  }

  _prevent(e) {
    e.preventDefault();
  }

  _getCell(e) {
    const bounds = this.canvas.getBoundingClientRect();
    const o = this.border * 0.5 - this.outerBorder;
    const x = Math.floor(((e.clientX - bounds.left) * this.dpr + o) / (this.cw + this.border));
    const y = Math.floor(((e.clientY - bounds.top) * this.dpr + o) / (this.ch + this.border));
    if (x < 0 || x >= this.w || y < 0 || y >= this.h) {
      return null;
    }
    return { x, y };
  }

  _md(e) {
    if (this.updating || this._readonly) {
      return;
    }
    e.preventDefault();
    const c = this._getCell(e);
    if (!c) {
      return;
    }
    const updated = this.getChange(this.values[c.y * this.w + c.x], e.button > 0 || e.altKey);
    if (updated === undefined || updated === null) {
      return;
    }
    this.updating = { pointer: e.pointerId, value: updated };
    this.canvas.setPointerCapture(e.pointerId);
    window.addEventListener('pointermove', this._mm, { passive: true });
    window.addEventListener('pointerup', this._mu, { passive: true });
    window.addEventListener('pointercancel', this._mc, { passive: true });
    this._mm(e);
  }

  _mm(e) {
    if (e.pointerId !== this.updating.pointer || this._readonly) {
      return;
    }
    const c = this._getCell(e);
    if (c) {
      this.setCell(c.x, c.y, this.updating.value);
    }
  }

  _mu(e) {
    if (e.pointerId !== this.updating.pointer) {
      return;
    }
    this._mm(e);
    this._removePointerEvents();
  }

  _mc(e) {
    if (e.pointerId !== this.updating.pointer) {
      return;
    }
    this._removePointerEvents();
  }

  getGrid() {
    return { width: this.w, height: this.h, data: this.values };
  }

  setGrid({ width, height, data }) {
    if (width <= 0 || height <= 0) {
      throw new Error('invalid size');
    }
    if (this.w !== width || this.h !== height) {
      this.w = width;
      this.h = height;
      this.values = new Uint8Array(this.w * this.h);
    }
    this.marks.length = 0;
    this.values.set(data, 0);
    this.dispatchEvent(new CustomEvent('change', { detail: this.getGrid() }));
    this._markDirty();
  }

  getTotalCellSize() {
    return {
      width: (this.cw + this.border) / this.dpr,
      height: (this.ch + this.border) / this.dpr,
    };
  }

  fill(fill = UNKNOWN) {
    this.values.fill(fill);
    this.dispatchEvent(new CustomEvent('change', { detail: this.getGrid() }));
    this._markDirty();
  }

  setCell(x, y, value) {
    const p = y * this.w + x;
    if (this.values[p] !== value) {
      this.values[p] = value;
      this.dispatchEvent(new CustomEvent('change', { detail: { ...this.getGrid(), x, y } }));
      this._markDirty();
    }
  }

  clearMarked() {
    if (this.marks.length) {
      this.marks.length = 0;
      this._markDirty();
    }
  }

  mark(type, cells) {
    if (!cells.length) {
      return;
    }
    this.marks.push({
      type,
      cells: cells.map((c) => typeof c === 'number' ? { x: c % this.w, y: (c / this.w)|0 } : c),
    });
    this._markDirty();
  }

  resize({ width = null, height = null, fill = UNKNOWN, dx = 0, dy = 0 }) {
    const oldW = this.w;
    const oldH = this.h;
    const oldValues = this.values;
    if (width < 0 || height < 0) {
      throw new Error('invalid size');
    }
    this.w = width ?? oldW;
    this.h = height ?? oldH;
    this.values = new Uint8Array(this.w * this.h);
    this.marks.length = 0;
    for (let y = 0; y < this.h; ++y) {
      const oy = y - dy;
      if (oy >= 0 && oy < oldH) {
        for (let x = 0; x < this.w; ++x) {
          const ox = x - dx;
          if (ox >= 0 && ox < oldW) {
            this.values[y * this.w + x] = oldValues[oy * oldW + ox];
          } else {
            this.values[y * this.w + x] = fill;
          }
        }
      } else {
        for (let x = 0; x < this.w; ++x) {
          this.values[y * this.w + x] = fill;
        }
      }
    }
    this.dispatchEvent(new CustomEvent('change', { detail: this.getGrid() }));
    this._markDirty();
  }

  async _init() {
    const { cw, ch, border } = this;
    const tw = cw + border * 2;
    const th = ch + border * 2;
    this.canvas.width = tw * 4;
    this.canvas.height = th;
    this.lastw = -1;
    this.lasth = -1;

    this.ctx.fillStyle = gGridOnOverlay;
    this.ctx.fillRect(tw * ON, 0, tw, th);
    this.ctx.fillStyle = cBackOn;
    this.ctx.fillRect(tw * ON + border, border, cw, ch);
    this.ctx.fillStyle = cBackOff;
    this.ctx.fillRect(tw * OFF + border, border, cw, ch);
    this.ctx.fillRect(tw * UNKNOWN + border, border, cw, ch);
    this.ctx.strokeStyle = cCross;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = 0.6 * this.dpr;
    this.ctx.beginPath();
    this.ctx.moveTo(tw * OFF + border + cw * 0.25, border + ch * 0.25);
    this.ctx.lineTo(tw * OFF + border + cw * 0.75, border + ch * 0.75);
    this.ctx.moveTo(tw * OFF + border + cw * 0.25, border + ch * 0.75);
    this.ctx.lineTo(tw * OFF + border + cw * 0.75, border + ch * 0.25);
    this.ctx.stroke();

    this.tiles = await createImageBitmap(this.canvas, 0, 0, this.canvas.width, this.canvas.height);
  }

  _markDirty() {
    if (!this.dirty) {
      this.dirty = true;
      Promise.resolve().then(() => this._draw());
    }
  }

  async _draw() {
    if (!this.tiles) {
      if (this.initialising) {
        return;
      }
      this.initialising = true;
      await this._init();
    }
    if (!this.dirty) {
      return;
    }
    this.dirty = false;

    const { w, h, cw, ch, border, outerBorder, majorX, majorY } = this;
    const o = outerBorder - border;

    const fullWidth = w * (cw + border) - border + outerBorder * 2;
    const fullHeight = h * (ch + border) - border + outerBorder * 2;
    if (this.lastw !== fullWidth || this.lasth !== fullHeight) {
      this.canvas.width = fullWidth;
      this.canvas.height = fullHeight;
      this.canvas.style.width = `${fullWidth / this.dpr}px`;
      this.canvas.style.height = `${fullHeight / this.dpr}px`;
      this.lastw = fullWidth;
      this.lasth = fullHeight;
    }

    this.ctx.fillStyle = cGridOffMinor;
    this.ctx.fillRect(0, 0, fullWidth, fullHeight);

    this.ctx.fillStyle = cGridOffMajor;
    if (majorX) {
      this.ctx.fillRect(0, 0, outerBorder, fullHeight);
      for (let x = majorX; x < w; x += majorX) {
        this.ctx.fillRect(x * (cw + border) + o, 0, border, fullHeight);
      }
      if (w % majorX === 0) {
        this.ctx.fillRect(fullWidth - outerBorder, 0, outerBorder, fullHeight);
      }
    }
    if (majorY) {
      this.ctx.fillRect(0, 0, fullWidth, outerBorder);
      for (let y = majorY; y < h; y += majorY) {
        this.ctx.fillRect(0, y * (ch + border) + o, fullWidth, border);
      }
      if (h % majorY === 0) {
        this.ctx.fillRect(0, fullHeight - outerBorder, fullWidth, outerBorder);
      }
    }

    const tw = cw + border * 2;
    const th = ch + border * 2;
    for (let y = 0; y < h; ++y) {
      const yy = y * (ch + border) + outerBorder;
      for (let x = 0; x < w; ++x) {
        const state = this.values[y * w + x];
        const xx = x * (cw + border) + outerBorder;
        this.ctx.drawImage(this.tiles, state * tw, 0, tw, th, xx - border, yy - border, tw, th);
      }
    }

    for (const mark of this.marks) {
      switch (mark.type) {
        case 'cells': {
          const r = border * 0.5;
          this.ctx.strokeStyle = '#FF0000';
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          this.ctx.lineWidth = Math.max(r * 2, 3 * this.dpr);
          for (const { x, y } of mark.cells) {
            this.ctx.strokeRect(x * (cw + border) + border - r, y * (ch + border) + border - r, cw + r * 2, ch + r * 2);
          }
          break;
        }
        case 'path': {
          this.ctx.strokeStyle = 'rgba(0, 128, 255, 0.5)';
          this.ctx.lineCap = 'round';
          this.ctx.lineJoin = 'round';
          let prevX = 0;
          let prevY = 0;
          for (let i = 0; i < mark.cells.length; ++i) {
            const { x, y } = mark.cells[i];
            const xx = x * (cw + border) + border + cw * 0.5;
            const yy = y * (ch + border) + border + ch * 0.5;
            if (i === 0) {
              this.ctx.lineWidth = 10 * this.dpr;
              this.ctx.beginPath();
              this.ctx.moveTo(xx, yy);
              this.ctx.lineTo(xx, yy);
              this.ctx.stroke();
            } else {
              this.ctx.lineWidth = 2 * this.dpr;
              this.ctx.beginPath();
              this.ctx.moveTo(prevX, prevY);
              this.ctx.lineTo(xx, yy);
              this.ctx.stroke();
              this.ctx.lineWidth = (i === mark.cells.length - 1 ? 6 : 4) * this.dpr;
              this.ctx.beginPath();
              this.ctx.moveTo(xx, yy);
              this.ctx.lineTo(xx, yy);
              this.ctx.stroke();
            }
            prevX = xx;
            prevY = yy;
          }
        }
      }
    }
  }
}
