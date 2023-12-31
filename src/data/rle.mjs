export const RUN = Symbol();

export function runLengthEncode(data, minRunLength, valueMap = (v) => v) {
  const size = data.length;
  const stream = [];
  for (let p = 0; p < size; ++p) {
    const v = valueMap(data[p]);
    stream.push({ type: v, arg: null });
    let run = 1;
    for (let pp = p + 1; pp < size && valueMap(data[pp]) === v; ++pp) {
      ++run;
    }
    if (run >= minRunLength) {
      stream.push({ type: RUN, omit: null, arg: run - minRunLength });
      p += run - 1;
    }
  }
  return stream;
}
