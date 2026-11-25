#!/usr/bin/env node

import { launchBrowser } from './lib/harness.mjs';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join, resolve, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'images');
const WRITE = process.argv.includes('--write');

const MIN_BYTES = 60 * 1024;
const QUALITY = 0.86;

const targets = readdirSync(SRC)
  .filter((f) => ['.png', '.jpg', '.jpeg'].includes(extname(f).toLowerCase()))
  .map((f) => ({ file: f, bytes: statSync(join(SRC, f)).size }))
  .filter((t) => t.bytes >= MIN_BYTES)
  .sort((a, b) => b.bytes - a.bytes);

if (!targets.length) {
  console.log(`Nothing in images/ is at or above ${(MIN_BYTES / 1024).toFixed(0)} KB.`);
  process.exit(0);
}

const browser = await launchBrowser();
const { send } = browser;

let saved = 0;
for (const t of targets) {
  const dataUri = `data:image/${extname(t.file).slice(1).replace('jpg', 'jpeg')};base64,`
    + readFileSync(join(SRC, t.file)).toString('base64');

  const { result } = await send('Runtime.evaluate', {
    awaitPromise: true, returnByValue: true,
    expression: `(async () => {
      const img = new Image();
      img.src = ${JSON.stringify(dataUri)};
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return JSON.stringify({
        w: img.naturalWidth, h: img.naturalHeight,
        webp: c.toDataURL('image/webp', ${QUALITY}).split(',')[1],
      });
    })()`,
  });

  const { w, h, webp } = JSON.parse(result.value);
  const bytes = Buffer.from(webp, 'base64');
  const out = basename(t.file, extname(t.file)) + '.webp';
  const pct = (100 - (bytes.length / t.bytes) * 100).toFixed(0);

  console.log(`  ${t.file.padEnd(28)} ${w}x${h}  ${(t.bytes / 1024).toFixed(0).padStart(4)} KB -> ${(bytes.length / 1024).toFixed(0).padStart(4)} KB  (-${pct}%)  ${out}`);
  if (WRITE) {
    writeFileSync(join(SRC, out), bytes);
    saved += t.bytes - bytes.length;
  }
}

await browser.close();

console.log(WRITE
  ? `\nWrote ${targets.length} file(s), ${(saved / 1024).toFixed(0)} KB saved. Update the <img> tags to point at them.`
  : `\nDry run. Re-run with --write to emit the .webp files.`);
