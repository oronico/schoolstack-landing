#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, serveSite, launchBrowser, sleep } from './lib/harness.mjs';
import { RETIRED_ANCHORS } from './lib/page-audit.mjs';

const VIEWPORTS = [1440, 820, 390];
const TOLERANCE = 0.02;

const STRETCHED_JS = `() => {
  const out = [];
  for (const img of document.images) {
    const r = img.getBoundingClientRect();
    if (!r.width || !r.height || !img.naturalWidth || !img.naturalHeight) continue;
    const rendered = r.width / r.height;
    const natural = img.naturalWidth / img.naturalHeight;
    if (Math.abs(rendered - natural) / natural > ${TOLERANCE}) {
      out.push({
        src: (img.getAttribute('src') || '').split('/').pop(),
        rendered: Math.round(r.width) + 'x' + Math.round(r.height),
        renderedRatio: +rendered.toFixed(3),
        natural: img.naturalWidth + 'x' + img.naturalHeight,
        naturalRatio: +natural.toFixed(3),
      });
    }
  }
  return out;
}`;

const LARGE_TEXT = '150%';

const PAGES = {
  '/': {
    minImages: 8,
    h1: 1,
    minTextChars: 4000,
    ids: ['budget-calculator', 'tools', 'platform', 'early-access', 'faq', 'signupForm', 'submitBtn',
      'design-partners', 'apply', 'signup',
      'nav-menu'],
  },
  '/about': {
    minImages: 3,
    h1: 1,
    minTextChars: 3000,
    ids: ['people', 'values', 'contact', 'allison-name', 'daniel-name', 'nav-menu'],
  },
  '/privacy': { minImages: 2, h1: 1, minTextChars: 2500, ids: ['nav-menu'] },
  '/terms': { minImages: 2, h1: 1, minTextChars: 2000, ids: ['nav-menu'] },
  '/404': { minImages: 2, h1: 1, minTextChars: 500, ids: ['nav-menu'] },
  '/giving': { minImages: 2, h1: 1, minTextChars: 5000, ids: ['plan', 'gifts', 'amounts', 'list', 'write', 'send', 'thanks', 'prompt-list', 'prompt-emails', 'nav-menu'] },
  '/enrollment/': { minImages: 1, h1: 1, minTextChars: 4000, ids: ['main', 'audit', 'forces', 'phases', 'cal'] },
};

const UNLINKED_ON_PURPOSE = new Set(['/go/lending-lab', '/go/screener']);

const RETIRED = [/lending lab/i, /\bfour tools\b/i, /\ball four\b/i, /check your fit/i];

const site = await serveSite();
const browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
await browser.send('Page.enable');

const failures = [];

for (const [path, EXPECT] of Object.entries(PAGES))
for (const width of VIEWPORTS) {
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  const navError = await browser.navigate(site.base + path);
  if (navError) {
    failures.push(`${path} ${width}px  navigation failed: ${navError}`);
    continue;
  }
  await sleep(2000);

  const r = await browser.evaluate(`(async () => {
      await document.fonts.ready;
      // Force lazy images in: naturalWidth stays 0 until they load, and an
      // unloaded image cannot be ratio-checked.
      document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
      await new Promise(r => setTimeout(r, 1200));
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));

      const stretched = (${STRETCHED_JS})();

      const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')];
      const skips = [];
      for (let i = 1; i < hs.length; i++) {
        const prev = +hs[i - 1].tagName[1], cur = +hs[i].tagName[1];
        if (cur - prev > 1) skips.push('h' + prev + ' -> h' + cur + ' at "' + hs[i].textContent.trim().slice(0, 40) + '"');
      }

      // A bare href="#" is a link that goes nowhere: it appends a fragment to
      // the URL and leaves the visitor where they were. The nav logo shipped
      // this way, so clicking the wordmark did not go home.
      const deadAnchors = [...document.querySelectorAll('a[href="#"], a[href=""]')]
        .map(a => (a.getAttribute('aria-label') || a.textContent.trim() || a.className || 'link').slice(0, 40));

      // Every /go/* CTA depends on a matching rule in _redirects. A typo there
      // is a dead call-to-action on a live marketing page, and nothing else
      // would catch it: the link looks perfectly valid in the markup.
      const goLinks = [...new Set([...document.querySelectorAll('a[href^="/go/"]')]
        .map(a => a.getAttribute('href')))];

      // The brand faces, checked as USED rather than as requested. A drift
      // between the family names in fonts/fonts.css and the ones :root asks
      // for renders the whole site in Trebuchet MS: the files still load, so
      // no request 4xxs and every other check stays green. This is the same
      // silent fallback that once shipped the OG card in DejaVu Sans.
      //
      // NOT document.fonts.check(): it answers "could this text be painted",
      // and a fallback always can, so it returned true for a family name that
      // did not exist. Two questions that do discriminate:
      //   1. is a face with that family actually in the loaded set, and
      //   2. does the text measure differently from the same text in the
      //      generic fallback alone?
      // Both must hold. (1) alone misses a face that loads but is never
      // applied; (2) alone would trip on a face with fallback-like metrics.
      const ctx = document.createElement('canvas').getContext('2d');
      const SAMPLE = 'Handgloves 0123456789';
      const widthIn = (stack) => { ctx.font = '700 40px ' + stack; return ctx.measureText(SAMPLE).width; };

      const fontsApplied = {};
      for (const [role, sel] of [['display', 'h1'], ['body', 'p']]) {
        const el = document.querySelector(sel);
        const want = getComputedStyle(document.documentElement)
          .getPropertyValue('--font-' + role).trim().split(',')[0].replace(/['"]/g, '');
        const faces = [...document.fonts].filter((f) => f.family === want);
        fontsApplied[role] = {
          want,
          inFaceSet: faces.length > 0,
          faceStatus: faces.map((f) => f.status).join(',') || 'none',
          distinctFromFallback: !!want && widthIn('"' + want + '", monospace') !== widthIn('monospace'),
          computed: el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '') : null,
        };
      }

      const bodyText = document.body.innerText || '';
      const retired = ${JSON.stringify(RETIRED.map((r) => r.source))}
        .filter((src) => new RegExp(src, 'i').test(bodyText));

      // Every in-page destination in the nav and footer, and every FAQ
      // question (each one is a shareable link, /#faq-cost), scrolled to the
      // way a click does it (scroll-margin respected): its first heading has
      // to sit below the fixed nav, not under it.
      const nav = document.querySelector('nav');
      const hidden = [];
      const targets = [...new Set([...document.querySelectorAll('nav a[href*="#"], footer a[href*="#"], .hero a[href^="#"]')]
        .map((a) => a.getAttribute('href').split('#')[1])
        .concat([...document.querySelectorAll('details.faq-item[id]')].map((d) => d.id)))];
      for (const id of nav ? targets : []) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.scrollIntoView({ block: 'start', behavior: 'instant' });
        const heading = el.querySelector('h2, h3') || el;
        const top = heading.getBoundingClientRect().top;
        const navBottom = nav.getBoundingClientRect().bottom;
        if (top < navBottom) hidden.push(id + ' (' + Math.round(top) + 'px, nav ends ' + Math.round(navBottom) + 'px)');
      }
      // An empty marker that keeps a retired id alive must land exactly where
      // the id that replaced it does, so an old link sees the same view.
      const replaces = ${JSON.stringify(RETIRED_ANCHORS)};
      const landAt = (el) => { el.scrollIntoView({ block: 'start', behavior: 'instant' }); return Math.round(window.scrollY); };
      const aliasDrift = [...document.querySelectorAll('.anchor-alias[id]')].flatMap((a) => {
        const to = document.getElementById(replaces[a.id] || '');
        if (!to) return [a.id + ' replaces nothing in RETIRED_ANCHORS'];
        const [from, want] = [landAt(a), landAt(to)];
        return Math.abs(from - want) > 1 ? [a.id + ' lands at ' + from + 'px, #' + to.id + ' at ' + want + 'px'] : [];
      });
      window.scrollTo(0, 0);

      return JSON.stringify({
        stretched, skips, goLinks, deadAnchors, fontsApplied, retired, hidden, aliasDrift,
        title: document.title.trim(),
        h1: document.querySelectorAll('h1').length,
        textChars: (document.body.innerText || '').trim().length,
        missingIds: ${JSON.stringify(EXPECT.ids)}.filter((id) => !document.getElementById(id)),
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1
          ? document.documentElement.scrollWidth + ' > ' + window.innerWidth : null,
        images: document.images.length,
      });
    })()`, { awaitPromise: true });

  console.log(`${path.padEnd(7)}${String(width).padStart(4)}px  ${r.images} images  `
    + `stretched: ${r.stretched.length || 'none'}  heading skips: ${r.skips.length || 'none'}  `
    + `overflow: ${r.overflow || 'none'}  `
    + `${r.textChars} chars of copy  ${r.h1} h1`);

  if (!r.title) failures.push(`${path} ${width}px  the page has no <title> - did it load?`);
  if (r.images < EXPECT.minImages) {
    failures.push(`${path} ${width}px  ${r.images} images rendered, expected at least ${EXPECT.minImages} - did the page load?`);
  }
  if (r.h1 !== EXPECT.h1) failures.push(`${path} ${width}px  ${r.h1} h1 elements, expected exactly ${EXPECT.h1}`);
  if (r.textChars < EXPECT.minTextChars) {
    failures.push(`${path} ${width}px  only ${r.textChars} characters of visible copy, expected at least ${EXPECT.minTextChars}`);
  }
  const ok = (f) => f.inFaceSet && f.distinctFromFallback && f.computed === f.want;
  console.log('        fonts  ' + Object.entries(r.fontsApplied)
    .map(([role, f]) => `${role}: ${f.computed} [${f.faceStatus}]${ok(f) ? '' : ' FALLING BACK'}`).join('  '));
  for (const [role, f] of Object.entries(r.fontsApplied)) {
    if (!f.inFaceSet) {
      failures.push(`${path} ${width}px  --font-${role} asks for '${f.want}' but no @font-face with that family is loaded (faces: ${f.faceStatus}) - the page is painting in a fallback`);
    } else if (!f.distinctFromFallback) {
      failures.push(`${path} ${width}px  --font-${role} '${f.want}' measures identically to the generic fallback - it is not being applied`);
    } else if (f.computed !== f.want) {
      failures.push(`${path} ${width}px  --font-${role} is '${f.want}' but the element computes to '${f.computed}'`);
    }
  }

  for (const id of r.missingIds) failures.push(`${path} ${width}px  #${id} is missing from the page`);
  for (const w of r.retired) failures.push(`${path} ${width}px  the page shows "${w}" - Lending Lab is off the public site and three tools are promoted`);
  for (const h of r.hidden) failures.push(`${path} ${width}px  a link to #${h} lands its heading under the fixed nav`);
  for (const d of r.aliasDrift) failures.push(`${path} ${width}px  retired anchor #${d}; put the marker where its replacement starts`);
  for (const a of r.deadAnchors) failures.push(`${path} ${width}px  "${a}" links to "#", which goes nowhere`);
  for (const s of r.stretched) {
    failures.push(`${path} ${width}px  ${s.src} rendered ${s.rendered} (ratio ${s.renderedRatio}) but is naturally ${s.natural} (ratio ${s.naturalRatio})`);
  }
  for (const s of r.skips) failures.push(`${path} ${width}px  heading skip: ${s}`);
  if (r.overflow) failures.push(`${path} ${width}px  horizontal overflow: ${r.overflow}`);

  if (path === '/' && width === VIEWPORTS[0] && r.goLinks?.length) {
    const rules = existsSync(join(ROOT, '_redirects'))
      ? readFileSync(join(ROOT, '_redirects'), 'utf8')
      : '';
    const declared = new Set(
      rules.split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
        .map((l) => l.trim().split(/\s+/)[0]),
    );
    const dead = r.goLinks.filter((h) => !declared.has(h));
    const unlinked = [...declared].filter((p) => p.startsWith('/go/') && !r.goLinks.includes(p) && !UNLINKED_ON_PURPOSE.has(p));
    console.log(`        ${r.goLinks.length} /go/ CTAs, unmatched in _redirects: ${dead.length || 'none'}`
      + `, redirect rules with no CTA: ${unlinked.length || 'none'}`);
    for (const d of dead) failures.push(`${d} has no rule in _redirects - dead call to action`);
    for (const u of unlinked) failures.push(`${u} is declared in _redirects but nothing on the page links to it`);
  }
}

for (const path of Object.keys(PAGES))
for (const width of VIEWPORTS) {
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  const navError = await browser.navigate(site.base + path);
  if (navError) {
    failures.push(`${path} ${width}px  text ${LARGE_TEXT}: navigation failed: ${navError}`);
    continue;
  }
  await sleep(1000);
  const stretched = await browser.evaluate(`(async () => {
      document.documentElement.style.fontSize = '${LARGE_TEXT}';
      document.querySelectorAll('img[loading="lazy"]').forEach(i => i.loading = 'eager');
      await new Promise(r => setTimeout(r, 800));
      await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
      return JSON.stringify((${STRETCHED_JS})());
    })()`, { awaitPromise: true });
  console.log(`${path.padEnd(7)}${String(width).padStart(4)}px  text ${LARGE_TEXT}  stretched: ${stretched.length || 'none'}`);
  for (const st of stretched) {
    failures.push(`${path} ${width}px  text ${LARGE_TEXT}: ${st.src} rendered ${st.rendered} (ratio ${st.renderedRatio}) but is naturally ${st.natural} (ratio ${st.naturalRatio})`);
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
  if (failures.some((f) => f.includes('text ' + LARGE_TEXT + ':'))) {
    console.log('\nAn image that squashes only at larger text has a height that grows with\n'
      + 'the text while its width is capped. Use max-height in place of height.');
  }
  if (failures.some((f) => f.includes('dead call to action'))) {
    console.log('\nAdd the missing path to _redirects, or point the link somewhere real.');
  }
  process.exit(1);
}
console.log('\nAll render checks passed');
