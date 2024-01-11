import { compressImage, decompressImage } from '../src/export/image.mjs';

export const STATE_UNSTARTED = 0;
export const STATE_STARTED = 1;
export const STATE_DONE = 2;

export class StateStore {
  save(id, state, grid) {
    try {
      window.localStorage.setItem(id, new URLSearchParams({
        s: state,
        i: compressImage(grid),
      }).toString());
    } catch (e) {
      console.warn('failed to save', e);
    }
  }

  load(id) {
    try {
      const data = new URLSearchParams(window.localStorage.getItem(id) ?? '');
      return {
        state: data.has('i') ? Number(data.get('s') ?? STATE_STARTED) : STATE_UNSTARTED,
        grid: data.has('i') ? decompressImage(data.get('i')) : null,
      };
    } catch (e) {
      console.warn('failed to load', e);
    }
    return { state: STATE_UNSTARTED, grid: null };
  }
}
