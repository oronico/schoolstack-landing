#!/usr/bin/env node

import { PAGES as VERSIONED_PAGES, stampVersions } from './lib/asset-version.mjs';
import { launchBrowser } from './lib/harness.mjs';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const GROUND = '#FAF9F7';
const HUES = ['#38BDF8', '#34D399', '#F59E0B'];

const DRAWINGS = {
  full: { box: 240, corner: 40, x: 24, h: 48, ys: [42, 96, 150], ws: [108, 153, 192] },
  px32: { box: 32, corner: 5, x: 3, h: 6, ys: [6, 13, 20], ws: [14, 20, 26] },
  px16: { box: 16, corner: 3, x: 1, h: 3, ys: [2, 6, 10], ws: [8, 11, 14] },
};

function markGroup(d, scale = 1) {
  const bars = HUES.map(
    (fill, i) =>
      `<rect x="${d.x}" y="${d.ys[i]}" width="${d.ws[i]}" height="${d.h}" rx="${d.h / 2}" fill="${fill}"></rect>`,
  ).join('');
  if (scale === 1) return bars;
  const c = d.box / 2;
  return `<g transform="translate(${c} ${c}) scale(${scale}) translate(${-c} ${-c})">${bars}</g>`;
}

function iconSvg(variant, d = DRAWINGS.full) {
  const radius = variant === 'rounded' ? d.corner : 0;
  const scale = variant === 'maskable' ? 0.72 : 1;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.box} ${d.box}" width="${d.box}" height="${d.box}">`
    + `<rect width="${d.box}" height="${d.box}" rx="${radius}" fill="${GROUND}"></rect>`
    + markGroup(d, scale)
    + `</svg>`;
}

const work = mkdtempSync(join(tmpdir(), 'ss-images-'));
const browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
const { send } = browser;
await send('Page.enable');

function once(method) {
  return new Promise((resolve) => {
    const off = browser.on((msg) => {
      if (msg.method === method) { off(); resolve(msg.params); }
    });
  });
}

async function shoot(htmlPath, outPath, width, height, expectFonts) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const loaded = once('Page.loadEventFired');
  await send('Page.navigate', { url: `file://${htmlPath}` });
  await loaded;

  await send('Runtime.evaluate', { expression: 'document.fonts.ready.then(() => 0)', awaitPromise: true });

  if (expectFonts?.length) {
    const { result } = await send('Runtime.evaluate', {
      expression: `JSON.stringify([...document.fonts].filter(f => f.status === 'loaded').map(f => f.family))`,
      returnByValue: true,
    });
    const loaded = new Set(JSON.parse(result.value));
    const missing = expectFonts.filter((f) => !loaded.has(f));
    if (missing.length) {
      throw new Error(
        `${outPath}: webfont(s) never loaded: ${missing.join(', ')}.\n`
        + `Loaded: ${[...loaded].join(', ') || '(none)'}.\n`
        + `Run "node tools/fetch-fonts.mjs" to populate fonts/, and check that\n`
        + `tools/og-image.html points at it by relative path.`,
      );
    }
  }

  const { data } = await send(
    'Page.captureScreenshot',
    { format: 'png', clip: { x: 0, y: 0, width, height, scale: 1 }, captureBeyondViewport: true },
  );
  writeFileSync(outPath, Buffer.from(data, 'base64'));
}

async function renderIcon(variant, size, outName, drawing) {
  const html = `<!DOCTYPE html><meta charset="utf-8">
<style>html,body{margin:0;padding:0;width:${size}px;height:${size}px;overflow:hidden}
svg{display:block;width:${size}px;height:${size}px}</style>
${iconSvg(variant, drawing)}`;
  const htmlPath = join(work, `icon-${outName}.html`);
  writeFileSync(htmlPath, html);
  await shoot(htmlPath, join(ROOT, outName), size, size);
  return outName;
}

const built = [];

writeFileSync(join(ROOT, 'favicon.svg'), iconSvg('rounded', DRAWINGS.px16) + '\n');
built.push('favicon.svg');

built.push(await renderIcon('rounded', 32, 'favicon-32.png', DRAWINGS.px32));
built.push(await renderIcon('rounded', 16, 'favicon-16.png', DRAWINGS.px16));
built.push(await renderIcon('square', 180, 'apple-touch-icon.png'));
built.push(await renderIcon('maskable', 192, 'icon-192.png'));
built.push(await renderIcon('maskable', 512, 'icon-512.png'));

built.push(await renderIcon('rounded', 180, 'favicon.png'));

await shoot(join(ROOT, 'tools', 'og-image.html'), join(ROOT, 'og-image.png'), 1200, 630,
  ['Quicksand', 'Inter']);
built.push('og-image.png');

await shoot(join(ROOT, 'tools', 'og-giving.html'), join(ROOT, 'og-giving.png'), 1200, 630,
  ['Quicksand', 'Inter']);
built.push('og-giving.png');

await browser.close();
rmSync(work, { recursive: true, force: true });

for (const name of built) {
  const kb = (statSync(join(ROOT, name)).size / 1024).toFixed(1);
  console.log(`  ${name.padEnd(24)} ${kb.padStart(8)} KB`);
}
console.log(`\n${built.length} assets written to ${ROOT}`);

const stamped = [];
for (const page of VERSIONED_PAGES) {
  const before = readFileSync(join(ROOT, page), 'utf8');
  const after = stampVersions(before, ROOT);
  if (after !== before) { writeFileSync(join(ROOT, page), after); stamped.push(page); }
}
console.log(`Versions: ${stamped.length ? 'stamped in ' + stamped.join(', ') : 'every ?v= already matches its file'}`);
