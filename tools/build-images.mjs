#!/usr/bin/env node
/**
 * Regenerates every raster brand asset the site serves: the OG share card and
 * the full favicon / app-icon set. Everything is rendered from vector sources
 * with headless Chromium, so there is no binary editing step and no drift
 * between the SVG mark and its PNG fallbacks.
 *
 *   node tools/build-images.mjs
 *
 * Chromium is located via CHROME_BIN, then the Playwright browser cache, then
 * a few common system paths. Rendering the OG card pulls Quicksand and Nunito
 * from Google Fonts, so that run needs network access; the icons do not.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------------------
   Brand geometry - the single source of truth for the mark.

   Three stacked rounded bars (sky / emerald / amber) on brand navy. The bars
   span 36 x 39 units inside a 64-unit square and are centred on both axes.
   --------------------------------------------------------------------------- */
const NAVY = '#141E33';
const BARS = [
  { w: 22, fill: '#7DD3FC' },
  { w: 29, fill: '#6EE7B7' },
  { w: 36, fill: '#FCD34D' },
];
const BAR_H = 9;
const BAR_GAP = 6;
const BOX = 64;

function markGroup(scale = 1) {
  const blockH = BARS.length * BAR_H + (BARS.length - 1) * BAR_GAP; // 39
  const blockW = Math.max(...BARS.map((b) => b.w)); // 36
  const x0 = (BOX - blockW) / 2;
  const y0 = (BOX - blockH) / 2;
  const bars = BARS.map(
    (b, i) =>
      `<rect x="${x0}" y="${y0 + i * (BAR_H + BAR_GAP)}" width="${b.w}" height="${BAR_H}" rx="${BAR_H / 2}" fill="${b.fill}"></rect>`,
  ).join('');
  if (scale === 1) return bars;
  const c = BOX / 2;
  return `<g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">${bars}</g>`;
}

/**
 * @param {'rounded'|'square'|'maskable'} variant
 *   rounded  - browser tab favicons, nothing masks them, so keep the radius
 *   square   - apple-touch-icon; iOS applies its own corner radius, and a
 *              pre-rounded source would double-round
 *   maskable - Android adaptive icons; the mark is scaled into the inner
 *              safe zone so a circular mask never clips it
 */
function iconSvg(variant) {
  const radius = variant === 'rounded' ? 14 : 0;
  const scale = variant === 'maskable' ? 0.82 : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${BOX} ${BOX}" width="${BOX}" height="${BOX}">`
    + `<rect width="${BOX}" height="${BOX}" rx="${radius}" fill="${NAVY}"></rect>`
    + markGroup(scale)
    + `</svg>`;
}

/* ---------------------------------------------------------------------------
   Chromium
   --------------------------------------------------------------------------- */
function findChrome() {
  const candidates = [process.env.CHROME_BIN].filter(Boolean);

  const pwRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(pwRoot)) {
    for (const entry of readdirSync(pwRoot)) {
      if (!entry.startsWith('chromium-')) continue;
      candidates.push(join(pwRoot, entry, 'chrome-linux', 'chrome'));
      candidates.push(join(pwRoot, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
    }
  }

  candidates.push(
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  );

  const found = candidates.find((p) => p && existsSync(p));
  if (!found) {
    throw new Error(
      'Could not find Chromium. Set CHROME_BIN to a Chrome or Chromium binary and re-run.',
    );
  }
  return found;
}

/* ---------------------------------------------------------------------------
   Chromium, driven over the DevTools protocol.

   The `--screenshot` CLI flag is not usable here: modern headless Chrome sizes
   the viewport to the *window* minus chrome, so `--window-size=1200,630` yields
   a 543px-tall viewport and pads the capture. Anything anchored to the bottom
   of the card lands in that dead band and silently disappears. Setting the
   metrics explicitly via Emulation.setDeviceMetricsOverride is exact.
   --------------------------------------------------------------------------- */
class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.waiters = new Map();
    ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      } else if (msg.method) {
        const key = `${msg.sessionId || ''}:${msg.method}`;
        const waiting = this.waiters.get(key);
        if (waiting?.length) {
          this.waiters.set(key, []);
          for (const resolve of waiting) resolve(msg.params);
        }
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    const payload = sessionId ? { id, method, params, sessionId } : { id, method, params };
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(payload));
    });
  }

  once(method, sessionId) {
    const key = `${sessionId || ''}:${method}`;
    return new Promise((resolve) => {
      this.waiters.set(key, [...(this.waiters.get(key) || []), resolve]);
    });
  }
}

const CHROME = findChrome();
const work = mkdtempSync(join(tmpdir(), 'ss-images-'));
const profile = mkdtempSync(join(tmpdir(), 'ss-chrome-'));

const chrome = spawn(
  CHROME,
  [
    '--headless',
    '--disable-gpu',
    '--no-sandbox',
    '--hide-scrollbars',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { stdio: ['ignore', 'pipe', 'pipe'] },
);

const wsUrl = await new Promise((resolve, reject) => {
  let buffered = '';
  const timer = setTimeout(() => reject(new Error('Timed out waiting for Chromium DevTools')), 30000);
  chrome.stderr.on('data', (chunk) => {
    buffered += chunk.toString();
    const match = buffered.match(/DevTools listening on (ws:\/\/\S+)/);
    if (match) {
      clearTimeout(timer);
      resolve(match[1]);
    }
  });
  chrome.on('exit', (code) => {
    clearTimeout(timer);
    reject(new Error(`Chromium exited early (${code})\n${buffered}`));
  });
});

const socket = new WebSocket(wsUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', () => reject(new Error('DevTools socket failed')), { once: true });
});

const cdp = new CDP(socket);
const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
await cdp.send('Page.enable', {}, sessionId);

/** Screenshot an HTML file at an exact pixel size. */
async function shoot(htmlPath, outPath, width, height) {
  await cdp.send(
    'Emulation.setDeviceMetricsOverride',
    { width, height, deviceScaleFactor: 1, mobile: false },
    sessionId,
  );

  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await cdp.send('Page.navigate', { url: `file://${htmlPath}` }, sessionId);
  await loaded;

  // Webfonts land after load; capturing before they settle renders fallbacks.
  await cdp.send(
    'Runtime.evaluate',
    { expression: 'document.fonts.ready.then(() => 0)', awaitPromise: true },
    sessionId,
  );

  const { data } = await cdp.send(
    'Page.captureScreenshot',
    { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: true },
    sessionId,
  );
  writeFileSync(outPath, Buffer.from(data, 'base64'));
}

async function renderIcon(variant, size, outName) {
  const html = `<!DOCTYPE html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
svg{display:block;width:${size}px;height:${size}px}</style>
${iconSvg(variant)}`;
  const htmlPath = join(work, `icon-${outName}.html`);
  writeFileSync(htmlPath, html);
  await shoot(htmlPath, join(ROOT, outName), size, size);
  return outName;
}

/* ---------------------------------------------------------------------------
   Build
   --------------------------------------------------------------------------- */
const built = [];

// The vector favicon every modern browser prefers, kept byte-identical to the
// rounded PNG fallbacks below.
writeFileSync(join(ROOT, 'favicon.svg'), iconSvg('rounded') + '\n');
built.push('favicon.svg');

built.push(await renderIcon('rounded', 32, 'favicon-32.png'));
built.push(await renderIcon('rounded', 16, 'favicon-16.png'));
built.push(await renderIcon('square', 180, 'apple-touch-icon.png'));
built.push(await renderIcon('maskable', 192, 'icon-192.png'));
built.push(await renderIcon('maskable', 512, 'icon-512.png'));

// Legacy /favicon.png request path - some crawlers and older clients still ask
// for it by name, so keep it pointing at a correctly sized, current-brand file.
built.push(await renderIcon('rounded', 180, 'favicon.png'));

// The OG card. Rendered last because it is the only step that needs the network.
await shoot(join(ROOT, 'tools', 'og-image.html'), join(ROOT, 'og-image.png'), 1200, 630);
built.push('og-image.png');

socket.close();
chrome.kill();
// Chromium keeps flushing its profile for a moment after SIGTERM; removing the
// directory out from under it races and throws ENOTEMPTY.
await new Promise((done) => {
  chrome.once('exit', done);
  setTimeout(done, 5000);
});
rmSync(work, { recursive: true, force: true });
try {
  rmSync(profile, { recursive: true, force: true });
} catch {
  /* a leftover temp profile is harmless */
}

for (const name of built) {
  const kb = (statSync(join(ROOT, name)).size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(24)} ${kb.padStart(8)} KB`);
}
console.log(`\n${built.length} assets written to ${ROOT}`);
