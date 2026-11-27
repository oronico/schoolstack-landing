#!/usr/bin/env node

import { serveSite, launchBrowser, sleep } from './lib/harness.mjs';
import { FOCUS_PROBE, ringProblem } from './lib/focus-audit.mjs';
import { TOUCH_AUDIT } from './lib/touch-audit.mjs';
import { CONTROL_EDGE_AUDIT, edgeProblem } from './lib/control-edge-audit.mjs';

async function tabWalk() {
  await browser.evaluate('(document.activeElement && document.activeElement.blur(), scrollTo(0, 0), 0)');
  const key = (type) => browser.send('Input.dispatchKeyEvent',
    { type, key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  const stops = [];
  let firstLabel = null;
  for (let i = 0; i < 150; i++) {
    await key('keyDown'); await key('keyUp');
    const p = await browser.evaluate(FOCUS_PROBE);
    if (!p) break;
    if (p.skip) continue;
    const id = p.tag + ':' + p.label;
    if (id === firstLabel) break;
    if (firstLabel === null) firstLabel = id;
    stops.push(p);
  }
  return stops;
}

const VIEWPORTS = [1440, 390];

const site = await serveSite();
const browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
await browser.send('Page.enable');
await browser.send('Emulation.setFocusEmulationEnabled', { enabled: true });

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

for (const path of ['/', '/about', '/privacy', '/terms', '/giving', '/ready', '/enrollment/'])
for (const width of VIEWPORTS) {
  await browser.send('Emulation.setDeviceMetricsOverride',
    { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  const navError = await browser.navigate(site.base + path);
  if (navError) { fail(`${path} ${width}px  navigation failed: ${navError}`); continue; }
  await sleep(2000);

  const r = await browser.evaluate(AUDIT, { awaitPromise: true });
  console.log(`${path.padEnd(7)}${String(width).padStart(4)}px  contrast: ${r.checked} elements checked, `
    + `${r.unchecked} not computable, ${r.low.length} below target  |  `
    + `main: ${r.mains}  skip link: ${r.skip ? 'yes' : 'no'}  lang: ${r.lang || 'MISSING'}`);

  for (const l of r.low) {
    fail(`${path} ${width}px  contrast ${l.ratio}:1 (needs ${l.need}:1) - ${l.color} on ${l.on} - "${l.text}"`);
  }
  if (r.mains !== 1) fail(`${path} ${width}px  ${r.mains} <main> landmarks, expected exactly 1`);
  if (!r.lang) fail(`${path} ${width}px  <html> has no lang attribute`);

  if (!r.skip) {
    fail(`${path} ${width}px  the first thing a keyboard reaches is "${r.firstFocusable}", not a skip link - `
      + 'every visit starts by tabbing through the whole nav');
  } else {
    if (!r.skip.targetExists) fail(`${path} ${width}px  the skip link points at an id that does not exist`);
    if (!r.skip.visibleOnFocus) fail(`${path} ${width}px  the skip link stays invisible when focused, so nobody knows it is there`);
  }

  for (const t of r.positiveTabindex) fail(`${path} ${width}px  "${t}" has a positive tabindex, which reorders the whole page`);
  for (const s of r.imgsNoAlt) fail(`${path} ${width}px  ${s} has no alt attribute`);
  for (const n of r.missingAutocomplete) fail(`${path} ${width}px  ${n} has no autocomplete, so the browser cannot fill it`);
  for (const u of r.unnamed) fail(`${path} ${width}px  the ${u} field has no label a screen reader can read`);
  for (const c of r.namelessControls) fail(`${path} ${width}px  the "${c}" control has no accessible name`);

  const edges = await browser.evaluate(CONTROL_EDGE_AUDIT);
  const thin = edges.controls.map((c) => edgeProblem(c)).filter(Boolean);
  console.log(`${' '.repeat(13)}control edges: ${edges.controls.length} controls, ${thin.length} under 3:1, ${edges.unchecked} not computable`);
  for (const t of thin) fail(`${path} ${width}px  ${t}`);

  const stops = await tabWalk();
  const blind = stops.map((p) => [p, ringProblem(p)]).filter(([, why]) => why);
  console.log(`${' '.repeat(13)}focus: ${stops.length} Tab stops, ${blind.length} without a visible ring`);
  for (const [p, why] of blind) fail(`${path} ${width}px  "${p.label}" (${p.tag}): ${why}`);
}

{
  const where = '/enrollment/ 390px touch';
  await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await browser.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
  const navError = await browser.navigate(site.base + '/enrollment/');
  if (navError) fail(`${where}  navigation failed: ${navError}`);
  else {
    await sleep(1000);
    const t = await browser.evaluate(TOUCH_AUDIT);
    console.log(`${where}  ${t.controls} controls, ${t.short.length} under 44px, ${t.smallText.length} fields under 16px`);
    if (!t.coarse) fail(`${where}  the browser did not report a touch screen, so the tap-target check proved nothing`);
    for (const s of t.short) fail(`${where}  tap target under 44px: ${s}`);
    for (const s of t.smallText) fail(`${where}  ${s} text, so iPhones zoom the page when it is tapped`);
  }
  await browser.send('Emulation.setTouchEmulationEnabled', { enabled: false });
}

for (const width of VIEWPORTS) {
  const where = `/enrollment/ ${width}px dark`;
  await browser.send('Emulation.setDeviceMetricsOverride',
    { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  await browser.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  const navError = await browser.navigate(site.base + '/enrollment/');
  if (navError) { fail(`${where}  navigation failed: ${navError}`); continue; }
  await sleep(1000);
  const edges = await browser.evaluate(CONTROL_EDGE_AUDIT);
  const thin = edges.controls.map((c) => edgeProblem(c)).filter(Boolean);
  console.log(`${where}  control edges: ${edges.controls.length} controls, ${thin.length} under 3:1, ${edges.unchecked} not computable`);
  if (!edges.dark) fail(`${where}  the browser did not report the dark theme, so the dark control-edge check proved nothing`);
  if (!edges.controls.length) fail(`${where}  no controls found, so the dark control-edge check proved nothing`);
  for (const t of thin) fail(`${where}  ${t}`);
}
await browser.send('Emulation.setEmulatedMedia', { features: [] });

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
