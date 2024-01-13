export function* readCSV(content) {
  const [head, ...lines] = content.split('\n')
    .map((ln) => ln.replace(/#.*/, ''))
    .filter((ln) => ln)
    .map((ln) => ln.split(',').map((v) => v.trim()));
  const headers = head.map((v) => v.toLowerCase());
  for (let i = 0; i < lines.length; ++i) {
    const line = lines[i];
    const entity = new Map();
    entity.set('row', i);
    for (let j = 0; j < headers.length; ++j) {
      entity.set(headers[j], line[j]);
    }
    yield entity;
  }
}
