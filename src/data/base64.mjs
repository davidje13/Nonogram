export const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

export const fromB64 = new Map();
for (let i = 0; i < 64; ++i) {
  fromB64.set(B64[i], i);
}
