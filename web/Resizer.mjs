import { el } from './dom.mjs';

const DIRECTIONS = [
  { className: 'n', x: 0, y: -1 },
  { className: 'w', x: -1, y: 0 },
  { className: 's', x: 0, y: 1 },
  { className: 'e', x: 1, y: 0 },
  { className: 'nw', x: -1, y: -1 },
  { className: 'ne', x: 1, y: -1 },
  { className: 'sw', x: -1, y: 1 },
  { className: 'se', x: 1, y: 1 },
];

export class Resizer extends EventTarget {
  constructor(content, {
    getCurrentSize = () => content.getBoundingClientRect(),
    getLabel = (w, h) => `${w}\u00D7${h}`,
    xScale = 1,
    yScale = 1,
    xMin = 0,
    yMin = 0,
    xMax = Number.POSITIVE_INFINITY,
    yMax = Number.POSITIVE_INFINITY,
  } = {}) {
    super();

    this._getCurrentSize = getCurrentSize;
    this._getLabel = getLabel;
    this.xScale = xScale;
    this.yScale = yScale;
    this.xMin = xMin;
    this.yMin = yMin;
    this.xMax = xMax;
    this.yMax = yMax;
    this.dragState = null;

    this.container = el('div', { 'class': 'resizer' });

    this._md = this._md.bind(this);
    this._mm = this._mm.bind(this);
    this._mmk = this._mmk.bind(this);
    this._mu = this._mu.bind(this);
    this._mc = this._mc.bind(this);

    this.handles = [];
    for (let i = 0; i < DIRECTIONS.length; ++i) {
      const handle = el('div', { 'class': `handle ${DIRECTIONS[i].className}` });
      handle.dataset.resizeIndex = i;
      handle.addEventListener('pointerdown', this._md, { passive: false });
      this.container.append(handle);
      this.handles.push(handle);
    }
    this.previewLabel = el('div', { 'class': 'label' });
    this.preview = el('div', { 'class': 'resize-preview' }, [this.previewLabel]);
    this.wrapper = el('div', { 'class': 'resize-wrapper' }, [content, this.preview]);
    this.container.append(this.wrapper);
  }

  _removePointerEvents() {
    window.removeEventListener('pointermove', this._mm);
    window.removeEventListener('keydown', this._mmk);
    window.removeEventListener('keyup', this._mmk);
    window.removeEventListener('pointerup', this._mu);
    window.removeEventListener('pointercancel', this._mc);
    if (this.dragState) {
      this.dragState.handle.releasePointerCapture(this.dragState.pointer);
      this.dragState = null;
    }
  }

  destroy() {
    for (const handle of this.handles) {
      handle.removeEventListener('pointerdown', this._md);
    }
    this._removePointerEvents();
  }

  _md(e) {
    const index = e.target.dataset?.resizeIndex;
    if (index === undefined || e.button !== 0 || this.dragState !== null) {
      return;
    }
    e.preventDefault();
    e.target.setPointerCapture(e.pointerId);
    const domSize = this.wrapper.getBoundingClientRect();
    const size = this._getCurrentSize();
    this.dragState = {
      pointer: e.pointerId,
      start: {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        padX: domSize.width - size.width * this.xScale,
        padY: domSize.height - size.height * this.yScale,
      },
      latest: { x: e.clientX, y: e.clientY, altKey: e.altKey },
      handle: e.target,
      mode: DIRECTIONS[index],
    };
    window.addEventListener('pointermove', this._mm, { passive: true });
    window.addEventListener('keydown', this._mmk, { passive: true });
    window.addEventListener('keyup', this._mmk);
    window.addEventListener('pointerup', this._mu, { passive: true });
    window.addEventListener('pointercancel', this._mc, { passive: true });
    this.preview.style.display = 'grid';
    this._mm(e);
  }

  _updatePreview() {
    const { start, latest, mode } = this.dragState;
    const mult = latest.altKey ? 2 : 1;
    const xDiff = Math.round((latest.x - start.x) / this.xScale) * mult * mode.x;
    const yDiff = Math.round((latest.y - start.y) / this.yScale) * mult * mode.y;
    const w = Math.max(this.xMin, Math.min(this.xMax, start.width + xDiff));
    const h = Math.max(this.yMin, Math.min(this.yMax, start.height + yDiff));

    const dx = (w - start.width) * (latest.altKey ? 0.5 : mode.x < 0 ? 1 : 0);
    const dy = (h - start.height) * (latest.altKey ? 0.5 : mode.y < 0 ? 1 : 0);

    this.preview.style.left = `${-dx * this.xScale}px`;
    this.preview.style.width = `${w * this.xScale + start.padX}px`;
    this.preview.style.top = `${-dy * this.yScale}px`;
    this.preview.style.height = `${h * this.yScale + start.padY}px`;
    const label = this._getLabel(w, h);
    if (label) {
      this.previewLabel.style.display = 'block';
      this.previewLabel.textContent = label;
    } else {
      this.previewLabel.style.display = 'none';
    }

    return { w, h, dx, dy };
  }

  _mm(e) {
    if (e.pointerId !== this.dragState.pointer) {
      return;
    }
    this.dragState.latest = { x: e.clientX, y: e.clientY, altKey: e.altKey };
    this._updatePreview();
  }

  _mmk(e) {
    if (this.dragState.latest.altKey !== e.altKey) {
      this.dragState.latest.altKey = e.altKey;
      this._updatePreview();
    }
  }

  _mu(e) {
    if (e.pointerId !== this.dragState.pointer) {
      return;
    }
    this.dragState.latest = { x: e.clientX, y: e.clientY, altKey: e.altKey };
    const { w, h, dx, dy } = this._updatePreview();
    const { start } = this.dragState;
    this._removePointerEvents();
    this.preview.style.display = 'none';
    this.preview.style.left = '0';
    this.preview.style.width = '0';
    this.preview.style.top = '0';
    this.preview.style.height = '0';
    this.previewLabel.textContent = '';
    if (w !== start.width || h !== start.height || dx !== 0 || dy !== 0) {
      this.dispatchEvent(new CustomEvent('change', { detail: {
        width: w,
        height: h,
        // dx/dy can be fractional if Alt is held and the grid is constrained by a boundary limit
        dx: Math.ceil(dx),
        dy: Math.ceil(dy),
      } }));
    }
  }

  _mc(e) {
    if (e.pointerId !== this.dragState.pointer) {
      return;
    }
    this._removePointerEvents();
    this.preview.style.display = 'none';
    this.preview.style.left = '0';
    this.preview.style.width = '0';
    this.preview.style.top = '0';
    this.preview.style.height = '0';
    this.previewLabel.textContent = '';
  }
}
