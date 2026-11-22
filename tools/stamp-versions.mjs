import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './lib/harness.mjs';
import { PAGES, stampVersions } from './lib/asset-version.mjs';

let changed = 0;
for (const f of PAGES) {
  const before = readFileSync(join(ROOT, f), 'utf8');
  const after = stampVersions(before, ROOT);
  if (after !== before) { writeFileSync(join(ROOT, f), after); changed++; console.log(`stamped ${f}`); }
}
console.log(changed ? `${changed} file(s) stamped` : 'every version already matches its file');
