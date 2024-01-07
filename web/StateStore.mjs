import { compressImage, decompressImage } from '../src/export/image.mjs';

export class StateStore {
  save(id, grid) {
    try {
      window.localStorage.setItem(id, new URLSearchParams({
        i: compressImage(grid),
      }).toString());
    } catch (e) {
      console.warn('failed to save', e);
    }
  }

  load(id) {
    try {
      const data = new URLSearchParams(window.localStorage.getItem(id) ?? '');
      if (data.has('i')) {
        return decompressImage(data.get('i'));
      }
    } catch (e) {
      console.warn('failed to load', e);
    }
    return null;
  }
}
