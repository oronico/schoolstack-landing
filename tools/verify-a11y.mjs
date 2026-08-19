#!/usr/bin/env node
/**
 * Accessibility checks that need a laid-out page to answer:
 *
 *   node tools/verify-a11y.mjs
 *
 * verify-render already covers heading order. This covers the rest of what a
 * keyboard or a screen reader meets first, and the one thing only a browser
 * can compute: the actual contrast between rendered text and whatever colour
 * ends up behind it.
 *
 * Hand written rather than axe-core on purpose. This repo carries no
 * dependencies at all - the fonts are self-hosted so the CSP can forbid every
 * external origin - and adding the first one, with a lockfile and an install
 * step in CI, is a decision for the owner rather than a side effect of a test.
 * axe would be more thorough; these are the rules that matter most here.
 */

import { serveSite, launchBrowser, sleep } from './lib/harness.mjs';

const VIEWPORTS = [1440, 390];

const site = await serveSite();
const browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
await browser.send('Page.enable');

const failures = [];
const fail = (m) => failures.push(m);

const AUDIT = `(async () => {
  await document.fonts.ready;
  document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
  await new Promise(r => setTimeout(r, 800));

  const label = (el) => (el.getAttribute('aria-label') || el.id || el.name ||
    (el.textContent || '').trim() || el.tagName).slice(0, 45);

  /* --- contrast, the part only a browser knows ------------------------------
     Walk up for the first non-transparent background. If anything in that
     chain paints an image or a gradient the ratio is not computable, so the
     element is reported as unchecked rather than guessed at. */
  const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const backdrop = (el) => {
    for (let n = el; n && n !== document.documentElement.parentNode; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return { image: true };
      const c = rgb(cs.backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return { rgb: c.slice(0, 3) };
    }
    return { rgb: [255, 255, 255] };
  };

  const low = [];
  let unchecked = 0, checked = 0;
  for (const el of document.body.querySelectorAll('*')) {
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity === 0) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;

    const back = backdrop(el);
    if (back.image) { unchecked++; continue; }
    const fg = rgb(cs.color);
    if (fg.length >= 4 && fg[3] < 0.95) { unchecked++; continue; }

    const size = parseFloat(cs.fontSize), weight = +cs.fontWeight || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const [a, b] = [lum(fg.slice(0, 3)), lum(back.rgb)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    checked++;
    if (ratio < (large ? 3 : 4.5)) {
      low.push({
        text: (el.textContent || '').trim().slice(0, 40),
        ratio: +ratio.toFixed(2), need: large ? 3 : 4.5,
        color: cs.color, on: 'rgb(' + back.rgb.join(', ') + ')',
      });
    }
  }

  /* --- landmarks, keyboard, forms ---------------------------------------- */
  const focusables = [...document.querySelectorAll(
    'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]')]
    .filter(el => !el.disabled && getComputedStyle(el).display !== 'none');

  const first = focusables[0];
  let skip = null;
  if (first && (first.getAttribute('href') || '').startsWith('#')) {
    const target = document.getElementById(first.getAttribute('href').slice(1));
    first.focus();
    const r = first.getBoundingClientRect();
    // Having size is not the same as being on screen: the usual way to hide a
    // skip link is to park it off the left edge, which leaves the box intact.
    // It has to land inside the viewport when focused.
    skip = {
      text: first.textContent.trim(),
      targetExists: !!target,
      visibleOnFocus: r.width > 0 && r.height > 0
        && r.right > 0 && r.bottom > 0 && r.left < innerWidth && r.top < innerHeight,
    };
    first.blur();
  }

  // A control the browser can fill for the visitor should say so.
  const IDENTITY = { firstName: 'given-name', lastName: 'family-name', email: 'email', schoolName: 'organization' };
  const missingAutocomplete = Object.keys(IDENTITY)
    .filter(n => document.querySelector('[name="' + n + '"]'))
    .filter(n => !document.querySelector('[name="' + n + '"]').getAttribute('autocomplete'));

  const unnamed = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')]
    .filter(el => !(el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')
      || el.closest('label') || (el.id && document.querySelector('label[for="' + el.id + '"]'))))
    .map(label);

  const namelessControls = [...document.querySelectorAll('a[href], button')]
    .filter(el => !(el.textContent.trim() || el.getAttribute('aria-label')
      || el.querySelector('img[alt]:not([alt=""])')))
    .map(label);

  return JSON.stringify({
    low, checked, unchecked,
    mains: document.querySelectorAll('main').length,
    lang: document.documentElement.getAttribute('lang') || '',
    skip,
    firstFocusable: first ? label(first) : null,
    positiveTabindex: [...document.querySelectorAll('[tabindex]')]
      .filter(el => +el.getAttribute('tabindex') > 0).map(label),
    imgsNoAlt: [...document.images].filter(i => i.getAttribute('alt') === null)
      .map(i => (i.getAttribute('src') || '').split('/').pop()),
    missingAutocomplete, unnamed, namelessControls,
  });
})()`;

for (const width of VIEWPORTS) {
  await browser.send('Emulation.setDeviceMetricsOverride',
    { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  const navError = await browser.navigate(site.base + '/');
  if (navError) { fail(`${width}px  navigation failed: ${navError}`); continue; }
  await sleep(2000);

  const r = await browser.evaluate(AUDIT, { awaitPromise: true });
  console.log(`${String(width).padStart(4)}px  contrast: ${r.checked} elements checked, `
    + `${r.unchecked} not computable, ${r.low.length} below target  |  `
    + `main: ${r.mains}  skip link: ${r.skip ? 'yes' : 'no'}  lang: ${r.lang || 'MISSING'}`);

  for (const l of r.low) {
    fail(`${width}px  contrast ${l.ratio}:1 (needs ${l.need}:1) - ${l.color} on ${l.on} - "${l.text}"`);
  }
  if (r.mains !== 1) fail(`${width}px  ${r.mains} <main> landmarks, expected exactly 1`);
  if (!r.lang) fail(`${width}px  <html> has no lang attribute`);

  if (!r.skip) {
    fail(`${width}px  the first thing a keyboard reaches is "${r.firstFocusable}", not a skip link - `
      + 'every visit starts by tabbing through the whole nav');
  } else {
    if (!r.skip.targetExists) fail(`${width}px  the skip link points at an id that does not exist`);
    if (!r.skip.visibleOnFocus) fail(`${width}px  the skip link stays invisible when focused, so nobody knows it is there`);
  }

  for (const t of r.positiveTabindex) fail(`${width}px  "${t}" has a positive tabindex, which reorders the whole page`);
  for (const s of r.imgsNoAlt) fail(`${width}px  ${s} has no alt attribute`);
  for (const n of r.missingAutocomplete) fail(`${width}px  ${n} has no autocomplete, so the browser cannot fill it`);
  for (const u of r.unnamed) fail(`${width}px  the ${u} field has no label a screen reader can read`);
  for (const c of r.namelessControls) fail(`${width}px  the "${c}" control has no accessible name`);
}

await browser.close();
site.close();

if (failures.length) {
  const seen = new Set();
  const unique = failures.filter((f) => {
    const k = f.replace(/^\s*\d+px\s+/, '');
    return seen.has(k) ? false : seen.add(k);
  });
  console.log(`\n${failures.length} failure(s), ${unique.length} distinct:`);
  for (const f of unique) console.log('  ! ' + f);
  process.exit(1);
}
console.log('\nAll accessibility checks passed');
