#!/usr/bin/env node
/**
 * Loads the built page in headless Chromium at three viewports and asserts
 * things that only exist once the browser has laid the page out:
 *
 *   node tools/verify-render.mjs
 *
 *  1. No image is stretched. Compares each image's RENDERED aspect ratio to its
 *     natural one. This exists because adding width/height attributes to stop
 *     layout shift, without the matching `height: auto`, silently welded the
 *     dashboard preview to 768px tall and squashed it - and a source-level
 *     check that only looked for the attributes reported success.
 *  2. Heading levels never skip (h2 -> h4).
 *  3. Nothing overflows horizontally.
 *
 * Exits non-zero on any failure, naming the element and the numbers.
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VIEWPORTS = [1440, 820, 390];
const TOLERANCE = 0.02; // ratio drift we accept before calling it a stretch

const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml', '.txt': 'text/plain', '.json': 'application/json',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  if (!file.startsWith(ROOT) || !existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

function findChrome() {
  const candidates = [process.env.CHROME_BIN].filter(Boolean);
  const pwRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(pwRoot)) {
    for (const e of readdirSync(pwRoot)) {
      if (e.startsWith('chromium-')) candidates.push(join(pwRoot, e, 'chrome-linux', 'chrome'));
    }
  }
  candidates.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Could not find Chromium. Set CHROME_BIN and re-run.');
  return found;
}

const profile = mkdtempSync(join(tmpdir(), 'ss-render-'));
const chrome = spawn(findChrome(), [
  '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  const t = setTimeout(() => rej(new Error('Timed out waiting for Chromium')), 30000);
  chrome.stderr.on('data', (c) => {
    buf += c;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); res(m[1]); }
  });
  chrome.on('exit', (code) => { clearTimeout(t); rej(new Error(`Chromium exited ${code}`)); });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const q = pending.get(m.id); pending.delete(m.id);
    m.error ? q.reject(new Error(m.error.message)) : q.resolve(m.result);
  }
});
const send = (method, params = {}, sid) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify(sid ? { id, method, params, sessionId: sid } : { id, method, params }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Page.enable', {}, sessionId);

const failures = [];

for (const width of VIEWPORTS) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 }, sessionId);
  await send('Page.navigate', { url: base + '/' }, sessionId);
  await new Promise((r) => setTimeout(r, 3000));

  const { result } = await send('Runtime.evaluate', {
    returnByValue: true, awaitPromise: true,
    expression: `(async () => {
      await document.fonts.ready;
      // Force lazy images in: naturalWidth stays 0 until they load, and an
      // unloaded image cannot be ratio-checked.
      document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
      await new Promise(r => setTimeout(r, 1200));
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));

      const stretched = [];
      for (const img of document.images) {
        const r = img.getBoundingClientRect();
        if (!r.width || !r.height || !img.naturalWidth || !img.naturalHeight) continue;
        const rendered = r.width / r.height;
        const natural = img.naturalWidth / img.naturalHeight;
        if (Math.abs(rendered - natural) / natural > ${TOLERANCE}) {
          stretched.push({
            src: (img.getAttribute('src') || '').split('/').pop(),
            rendered: Math.round(r.width) + 'x' + Math.round(r.height),
            renderedRatio: +rendered.toFixed(3),
            natural: img.naturalWidth + 'x' + img.naturalHeight,
            naturalRatio: +natural.toFixed(3),
          });
        }
      }

      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      const skips = [];
      for (let i = 1; i < hs.length; i++) {
        const prev = +hs[i - 1].tagName[1], cur = +hs[i].tagName[1];
        if (cur - prev > 1) skips.push('h' + prev + ' -> h' + cur + ' at "' + hs[i].textContent.trim().slice(0, 40) + '"');
      }

      // Every /go/* CTA depends on a matching rule in _redirects. A typo there
      // is a dead call-to-action on a live marketing page, and nothing else
      // would catch it: the link looks perfectly valid in the markup.
      const goLinks = [...new Set([...document.querySelectorAll('a[href^="/go/"]')]
        .map(a => a.getAttribute('href')))];

      return JSON.stringify({
        stretched, skips, goLinks,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1
          ? document.documentElement.scrollWidth + ' > ' + window.innerWidth : null,
        images: document.images.length,
      });
    })()`,
  }, sessionId);

  const r = JSON.parse(result.value);
  console.log(`${String(width).padStart(4)}px  ${r.images} images  `
    + `stretched: ${r.stretched.length || 'none'}  heading skips: ${r.skips.length || 'none'}  `
    + `overflow: ${r.overflow || 'none'}`);
  for (const s of r.stretched) {
    failures.push(`${width}px  ${s.src} rendered ${s.rendered} (ratio ${s.renderedRatio}) but is naturally ${s.natural} (ratio ${s.naturalRatio})`);
  }
  for (const s of r.skips) failures.push(`${width}px  heading skip: ${s}`);
  if (r.overflow) failures.push(`${width}px  horizontal overflow: ${r.overflow}`);

  if (width === VIEWPORTS[0] && r.goLinks?.length) {
    const rules = existsSync(join(ROOT, '_redirects'))
      ? readFileSync(join(ROOT, '_redirects'), 'utf8')
      : '';
    const declared = new Set(
      rules.split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
        .map((l) => l.trim().split(/\s+/)[0]),
    );
    const dead = r.goLinks.filter((h) => !declared.has(h));
    console.log(`        ${r.goLinks.length} /go/ CTAs, unmatched in _redirects: ${dead.length || 'none'}`);
    for (const d of dead) failures.push(`${d} has no rule in _redirects - dead call to action`);
  }
}

ws.close(); chrome.kill(); server.close();
await new Promise((r) => { chrome.once('exit', r); setTimeout(r, 4000); });
try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ! ' + f);
  if (failures.some((f) => f.includes('naturally'))) {
    console.log('\nA stretched image usually means its CSS sets one dimension while the\n'
      + 'width/height attributes set the other. Add `height: auto`.');
  }
  if (failures.some((f) => f.includes('dead call to action'))) {
    console.log('\nAdd the missing path to _redirects, or point the link somewhere real.');
  }
  process.exit(1);
}
console.log('\nAll render checks passed');
