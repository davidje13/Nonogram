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

  async persist() {
    if (await navigator.storage.persisted()) {
      return true;
    }
    const request = Date.now();
    if (await navigator.storage.persist()) {
      return true;
    }
    if (Date.now() < request + 100) {
      throw new Error('browser refused persistence');
    }
    throw new Error('user refused persistence');
  }
}
