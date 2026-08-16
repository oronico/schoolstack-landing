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
 *  4. The page is actually there. See EXPECT below - without it, every check
 *     above reports only on elements it finds, so a page that failed to load
 *     has nothing to stretch, no headings to skip and nothing to overflow,
 *     and passes.
 *
 * Exits non-zero on any failure, naming the element and the numbers.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, serveSite, launchBrowser, sleep } from './lib/harness.mjs';

const VIEWPORTS = [1440, 820, 390];
const TOLERANCE = 0.02; // ratio drift we accept before calling it a stretch

/* The floor: what has to be on the page before a green run means anything.
   Deliberately floors and landmarks rather than exact counts, so ordinary copy
   and layout edits do not trip it - the failure being caught here is a blank
   or half-rendered page, not a paragraph that moved. Update these when the
   page genuinely changes shape. */
const EXPECT = {
  minImages: 8,      // logo, four tool marks, two funders, BHIF, footer logo
  h1: 1,
  minTextChars: 4000,
  // Landmarks: the two anchor targets the nav points at, plus the form the
  // whole page exists to feed.
  ids: ['tools', 'signup', 'faq', 'signupForm', 'submitBtn'],
};

const site = await serveSite();
const browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
await browser.send('Page.enable');

const failures = [];

for (const width of VIEWPORTS) {
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  const navError = await browser.navigate(site.base + '/');
  if (navError) {
    failures.push(`${width}px  navigation failed: ${navError}`);
    continue;
  }
  await sleep(3000);

  const r = await browser.evaluate(`(async () => {
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
        title: document.title.trim(),
        h1: document.querySelectorAll('h1').length,
        textChars: (document.body.innerText || '').trim().length,
        missingIds: ${JSON.stringify(EXPECT.ids)}.filter((id) => !document.getElementById(id)),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1
          ? document.documentElement.scrollWidth + ' > ' + window.innerWidth : null,
        images: document.images.length,
      });
    })()`, { awaitPromise: true });

  console.log(`${String(width).padStart(4)}px  ${r.images} images  `
    + `stretched: ${r.stretched.length || 'none'}  heading skips: ${r.skips.length || 'none'}  `
    + `overflow: ${r.overflow || 'none'}  `
    + `${r.textChars} chars of copy  ${r.h1} h1`);

  if (!r.title) failures.push(`${width}px  the page has no <title> - did it load?`);
  if (r.images < EXPECT.minImages) {
    failures.push(`${width}px  ${r.images} images rendered, expected at least ${EXPECT.minImages} - did the page load?`);
  }
  if (r.h1 !== EXPECT.h1) failures.push(`${width}px  ${r.h1} h1 elements, expected exactly ${EXPECT.h1}`);
  if (r.textChars < EXPECT.minTextChars) {
    failures.push(`${width}px  only ${r.textChars} characters of visible copy, expected at least ${EXPECT.minTextChars}`);
  }
  for (const id of r.missingIds) failures.push(`${width}px  #${id} is missing from the page`);
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
    // And the other direction. A rule with no link is a CTA that fell off the
    // page - the tool is still reachable, nobody can get to it from here, and
    // the link-to-rule check above stays perfectly green about it.
    const unlinked = [...declared].filter((p) => p.startsWith('/go/') && !r.goLinks.includes(p));
    console.log(`        ${r.goLinks.length} /go/ CTAs, unmatched in _redirects: ${dead.length || 'none'}`
      + `, redirect rules with no CTA: ${unlinked.length || 'none'}`);
    for (const d of dead) failures.push(`${d} has no rule in _redirects - dead call to action`);
    for (const u of unlinked) failures.push(`${u} is declared in _redirects but nothing on the page links to it`);
  }
}

await browser.close();
site.close();

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
