export const RUN = Symbol();

export function runLengthEncode(data, minRunLength) {
  const size = data.length;
  const stream = [];
  for (let p = 0; p < size; ++p) {
    const v = data[p];
    stream.push({ type: v });
    let run = 1;
    for (let pp = p + 1; pp < size && data[pp] === v; ++pp) {
      ++run;
    }
    if (run >= minRunLength) {
      stream.push({ type: RUN, arg: run - minRunLength });
      p += run - 1;
    }
  }
  return stream;
}
