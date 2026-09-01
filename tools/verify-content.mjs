#!/usr/bin/env node
/**
 * Checks the things that are true about the FILES rather than about the page
 * once a browser has it:
 *
 *   node tools/verify-content.mjs
 *
 * No browser, no server, no network. Everything here is invisible to the other
 * three checks, each for its own reason:
 *
 *  1. _redirects semantics. verify-render confirms every /go/ CTA has a rule
 *     and every rule has a CTA, but says nothing about the status code. The
 *     file itself documents why 302 is load-bearing: a 301 is cached by the
 *     browser, so only the first click per person ever reaches the CDN and the
 *     counts silently undercount. A one-character edit there is invisible.
 *  2. Structured data. The FAQ block in the JSON-LD has to stay word for word
 *     identical to the visible FAQ or Google drops the markup. Nothing warns
 *     you; the rich result just stops appearing.
 *  3. Assets nothing ever requests. og-image.png and the manifest icons are
 *     named in metadata that a page load never fetches, so a rename breaks
 *     every share card and every installed icon while all three browser checks
 *     stay green.
 *
 * Exits non-zero on any failure, naming the file and the values.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ROOT } from './lib/harness.mjs';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const html = read('index.html');

const failures = [];
const fail = (msg) => failures.push(msg);
const check = (ok, msg) => { if (!ok) fail(msg); return ok; };

/* ---------------------------------------------------------------------------
   1. _redirects
   --------------------------------------------------------------------------- */
const rules = read('_redirects').split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'))
  .map((l) => {
    const [from, to, code] = l.split(/\s+/);
    return { from, to, code };
  });

const go = rules.filter((r) => r.from.startsWith('/go/'));
const apex = rules.filter((r) => /^https?:\/\/www\./i.test(r.from));

console.log(`_redirects: ${rules.length} rules (${go.length} /go/, ${apex.length} canonicalising)`);

check(go.length > 0, '_redirects declares no /go/ rules at all');
for (const r of go) {
  // 302 on purpose. A 301 is cached by the browser, so the second and every
  // later click never reaches the CDN and never gets counted.
  check(r.code === '302',
    `${r.from} is a ${r.code || 'bare'} redirect, expected 302 - a cached 301 makes every click after the first invisible to analytics`);
  check(/^https:\/\//.test(r.to || ''),
    `${r.from} points at "${r.to}", expected an https URL`);
}
for (const r of apex) {
  check(r.code === '301!',
    `the www canonicalising rule is "${r.code}", expected 301! - anything softer leaves two hostnames answering 200 and splits ranking`);
}
check(apex.length === 1, `${apex.length} www canonicalising rules, expected exactly 1`);

/* ---------------------------------------------------------------------------
   2. Structured data, and the metadata that has to agree with itself
   --------------------------------------------------------------------------- */
const ldRaw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
let ld = null;
if (!check(ldRaw, 'index.html has no JSON-LD block')) {
  // nothing further to check
} else {
  try {
    ld = JSON.parse(ldRaw[1]);
  } catch (e) {
    fail(`the JSON-LD does not parse: ${e.message}`);
  }
}

const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

if (ld) {
  const graph = ld['@graph'] || [ld];
  const faqNode = graph.find((n) => n['@type'] === 'FAQPage');
  // Keyed on the id, not the class list: the section's classes are a layout
  // decision and changing one should not silently stop this check running.
  const faqSection = html.match(/<section[^>]*\bid="faq"[\s\S]*?<\/section>/);

  if (check(faqNode, 'the JSON-LD declares no FAQPage')
      && check(faqSection, 'index.html has no #faq section to compare the FAQPage against')) {
    const visible = [...faqSection[0].matchAll(/<h3>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)]
      .map((m) => ({ q: strip(m[1]), a: strip(m[2]) }));
    const marked = faqNode.mainEntity.map((e) => ({ q: strip(e.name), a: strip(e.acceptedAnswer.text) }));

    console.log(`FAQ: ${marked.length} in JSON-LD, ${visible.length} on the page`);
    check(marked.length === visible.length,
      `the JSON-LD lists ${marked.length} questions but the page shows ${visible.length}`);

    // Google drops FAQ markup that does not match the visible copy, silently.
    for (let i = 0; i < Math.min(marked.length, visible.length); i++) {
      check(marked[i].q === visible[i].q,
        `FAQ ${i + 1} question differs.\n      markup:  "${marked[i].q}"\n      visible: "${visible[i].q}"`);
      check(marked[i].a === visible[i].a,
        `FAQ ${i + 1} answer differs.\n      markup:  "${marked[i].a}"\n      visible: "${visible[i].a}"`);
    }
  }
}

const meta = (re) => (html.match(re) || [])[1];
const canonical = meta(/rel="canonical" href="([^"]+)"/);
const ogUrl = meta(/property="og:url" content="([^"]+)"/);
const sitemapLoc = (read('sitemap.xml').match(/<loc>([^<]+)<\/loc>/) || [])[1];
const themeMeta = meta(/name="theme-color" content="([^"]+)"/);
const manifest = JSON.parse(read('site.webmanifest'));

console.log(`Canonical: ${canonical}  og:url: ${ogUrl}  sitemap: ${sitemapLoc}`);
check(canonical && ogUrl === canonical, `og:url is "${ogUrl}" but canonical is "${canonical}"`);
check(canonical && sitemapLoc === canonical, `sitemap.xml lists "${sitemapLoc}" but canonical is "${canonical}"`);
check(themeMeta?.toLowerCase() === manifest.theme_color?.toLowerCase(),
  `<meta theme-color> is "${themeMeta}" but the manifest says "${manifest.theme_color}"`);

/* The declared share-card size has to match the file, or the card is cropped
   or letterboxed by whoever renders it. Read the real size out of the PNG. */
function pngSize(file) {
  const b = readFileSync(join(ROOT, file));
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const ogImage = meta(/property="og:image" content="([^"]+)"/);
const ogW = meta(/property="og:image:width" content="([^"]+)"/);
const ogH = meta(/property="og:image:height" content="([^"]+)"/);
if (ogImage) {
  const path = ogImage.replace(/^https?:\/\/[^/]+\//, '');
  if (check(existsSync(join(ROOT, path)), `og:image points at ${ogImage}, which is not in the repo`)) {
    const size = pngSize(path);
    console.log(`og:image: ${path} is ${size.w}x${size.h}, declared ${ogW}x${ogH}`);
    check(size && String(size.w) === ogW && String(size.h) === ogH,
      `og:image declares ${ogW}x${ogH} but ${path} is ${size?.w}x${size?.h}`);
  }
}

/* ---------------------------------------------------------------------------
   3. Everything referenced, including what a page load never asks for
   --------------------------------------------------------------------------- */
const referenced = new Set();
const note = (p) => { if (p && !/^(https?:|mailto:|data:|#)/.test(p)) referenced.add(p.split('?')[0].replace(/^\//, '')); };

for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) note(m[1]);
// Absolute metadata URLs on our own domain are still our files.
for (const m of html.matchAll(/content="https:\/\/schoolstack\.ai\/([^"]+\.(?:png|svg|webp|ico))"/g)) note(m[1]);
for (const i of manifest.icons) note(i.src);
// url() inside fonts/fonts.css resolves against fonts/, not the repo root.
for (const m of read('fonts/fonts.css').matchAll(/url\(([^)]+)\)/g)) {
  const href = m[1].replace(/['"]/g, '').split('?')[0];
  note(href.startsWith('/') ? href : join('fonts', href));
}

const missing = [...referenced].filter((p) => !p.startsWith('go/') && !existsSync(join(ROOT, p)));
console.log(`Referenced files: ${referenced.size}, missing: ${missing.length || 'none'}`);
for (const p of missing) fail(`${p} is referenced but is not in the repo`);

/* Orphans are reported, not failed: a brand asset can be committed ahead of the
   page that will use it. Silence about them is what lets the pile grow. */
const orphans = [];
for (const dir of ['assets/logos', 'images']) {
  if (!existsSync(join(ROOT, dir))) continue;
  for (const f of readdirSync(join(ROOT, dir))) {
    const rel = `${dir}/${f}`;
    if (statSync(join(ROOT, rel)).isFile() && !referenced.has(rel)) orphans.push(rel);
  }
}
if (orphans.length) {
  const kb = orphans.reduce((n, p) => n + statSync(join(ROOT, p)).size, 0) / 1024;
  console.log(`\nUnreferenced in assets/ and images/: ${orphans.length} files, ${kb.toFixed(0)} KB (not a failure)`);
  for (const o of orphans) console.log('  - ' + o);
}

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log('\nAll content checks passed');
