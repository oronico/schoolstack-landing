/**
 * Versions for files that cannot carry a hash in their name: the icons and
 * the link-preview card keep fixed URLs (browsers and social sites ask for
 * them by name), and so do the images in /images, which other sites may
 * link. A `?v=` query tells caches when the bytes change.
 *
 * The version is the first 8 hex digits of the sha256 of the file, never a
 * number typed by hand: a hand-kept `?v=3` stays put when someone rebuilds the
 * icons and forgets it, and returning visitors keep the old icon for a week.
 *
 * `build-images` stamps the versions after it writes the files; `verify-content`
 * fails if any is out of date. Both read the same list, PAGES, below.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Files that carry versioned references to the root-level images. */
export const PAGES = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'giving.html', 'enrollment/index.html', 'site.webmanifest'];

/* A reference with a ?v= query to a root-level file or one in /images:
   href="/favicon.svg?v=…", content="https://schoolstack.ai/og-image.png?v=…",
   "src": "/icon-192.png?v=…", src="/images/stt-logo.png?v=…". */
const REF = /((?:href=|content=|src=|"src":\s*)"(?:https:\/\/schoolstack\.ai)?\/)((?:images\/)?[\w.-]+\.(?:png|svg|ico|webp|jpg))\?v=([^"]*)"/g;

export const contentVersion = (root, file) => createHash('sha256').update(readFileSync(join(root, file))).digest('hex').slice(0, 8);

/** References whose version is not the file's content version, as `{ file, has, want }`. */
export function versionDrift(text, root) {
  const out = [];
  for (const [, , file, has] of text.matchAll(REF)) {
    const want = contentVersion(root, file);
    if (has !== want) out.push({ file, has, want });
  }
  return out;
}

/** The text with every versioned reference set to its file's content version. */
export function stampVersions(text, root) {
  return text.replace(REF, (_, pre, file) => `${pre}${file}?v=${contentVersion(root, file)}"`);
}

/** References to a file in /images with no ?v= at all, as `{ ref, line }`. */
export function unversionedImages(text) {
  const out = [];
  text.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/(?:src|srcset|poster|href|content)="((?:https:\/\/schoolstack\.ai)?\/images\/[^"?]+)"/g)) out.push({ ref: m[1], line: i + 1 });
  });
  return out;
}
