import { readFileSync } from 'node:fs';

import { readCSV } from '../src/data/csv.mjs';
import { extractRules } from '../src/game.mjs';
import { decompressRules } from '../src/export/rules.mjs';

export function* readInputRules() {
  const files = [];
  if (process.argv.length < 3) {
    files.push(process.stdin.fd);
  } else {
    for (let i = 2; i < process.argv.length; ++ i) {
      files.push(process.argv[i]);
    }
  }
  for (const file of files) {
    const content = readFileSync(file).toString();
    if (content[0] === '{') {
      yield { name: file, rules: extractRules(JSON.parse(content)) };
    } else if (content.includes(',')) {
      for (const item of readCSV(content)) {
        const compressedRules = item.get('rules');
        const name = item.get('name') ?? `#${item.get('row')}`;
        if (compressedRules) {
          yield { name: `${file} - ${name}`, rules: decompressRules(compressedRules) };
        }
      }
    } else {
      yield { name: file, rules: decompressRules(content.trim()) };
    }
  }
}
