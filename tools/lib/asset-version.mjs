import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const PAGES = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'giving.html', 'enrollment/index.html', 'site.webmanifest'];

const REF = /((?:href=|content=|src=|"src":\s*)"(?:https:\/\/schoolstack\.ai)?\/)((?:images\/)?[\w.-]+\.(?:png|svg|ico|webp|jpg))\?v=([^"]*)"/g;

export const contentVersion = (root, file) => createHash('sha256').update(readFileSync(join(root, file))).digest('hex').slice(0, 8);

export function versionDrift(text, root) {
  const out = [];
  for (const [, , file, has] of text.matchAll(REF)) {
    const want = contentVersion(root, file);
    if (has !== want) out.push({ file, has, want });
  }
  return out;
}

export function stampVersions(text, root) {
  return text.replace(REF, (_, pre, file) => `${pre}${file}?v=${contentVersion(root, file)}"`);
}

export function unversionedImages(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/(?:src|srcset|poster|href|content)="((?:https:\/\/schoolstack\.ai)?\/images\/[^"?]+)"/g)) out.push({ ref: m[1], line: i + 1 });
  });
  return out;
}
