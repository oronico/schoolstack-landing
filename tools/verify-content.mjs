#!/usr/bin/env node

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { ROOT } from './lib/harness.mjs';
import { voiceFaults, KNOWN_DEBT } from './lib/copy-rules.mjs';
import { danglingAnchors, unsafeBlankLinks, declaredFontFamilies, servedFontFamilies, chromeDrift, privacyFieldDrift, cookieUse, FORMS, faqDrift, retiredAnchorLinks, assetHashDrift, relativeFileRefs } from './lib/page-audit.mjs';
import { createHash } from 'node:crypto';
import { PAGES as VERSIONED_PAGES, versionDrift, unversionedImages } from './lib/asset-version.mjs';
import { commentScan, commentDrift } from './lib/comments.mjs';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const html = read('index.html');
const OTHER_PAGES = ['about.html', 'privacy.html', 'terms.html', 'giving.html', 'ready.html'];
const others = OTHER_PAGES.map((f) => ({ f, html: read(f) }));
const TOOL_PAGES = ['enrollment/index.html'];
const tools = TOOL_PAGES.map((f) => ({ f, html: read(f) }));
const allPages = [...others, ...tools];
const siteCss = read('css/site.css');

const failures = [];
const fail = (msg) => failures.push(msg);
const check = (ok, msg) => { if (!ok) fail(msg); return ok; };

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

const ldRaw = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
let ld = null;
if (!check(ldRaw, 'index.html has no JSON-LD block')) {
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
  const faqSection = html.match(/<section[^>]*\bid="faq"[\s\S]*?<\/section>/);

  if (check(faqNode, 'the JSON-LD declares no FAQPage')
      && check(faqSection, 'index.html has no #faq section to compare the FAQPage against')) {
    const problems = faqDrift(faqSection[0], faqNode.mainEntity);
    console.log(`FAQ: ${faqNode.mainEntity.length} in JSON-LD, paired by id: ${problems.length ? problems.length + ' problem(s)' : 'all match'}`);
    for (const p of problems) fail(`FAQ: ${p}`);
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
check(!/<lastmod>/.test(read('sitemap.xml')), 'sitemap.xml carries a <lastmod>: nothing keeps a hand-typed date true, so leave it out');
check(themeMeta?.toLowerCase() === manifest.theme_color?.toLowerCase(),
  `<meta theme-color> is "${themeMeta}" but the manifest says "${manifest.theme_color}"`);

function pngSize(file) {
  const b = readFileSync(join(ROOT, file));
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

const ogImage = meta(/property="og:image" content="([^"]+)"/);
const ogW = meta(/property="og:image:width" content="([^"]+)"/);
const ogH = meta(/property="og:image:height" content="([^"]+)"/);
if (ogImage) {
  const path = ogImage.replace(/^https?:\/\/[^/]+\//, '').replace(/[?#].*$/, '');
  if (check(existsSync(join(ROOT, path)), `og:image points at ${ogImage}, which is not in the repo`)) {
    const size = pngSize(path);
    console.log(`og:image: ${path} is ${size.w}x${size.h}, declared ${ogW}x${ogH}`);
    check(size && String(size.w) === ogW && String(size.h) === ogH,
      `og:image declares ${ogW}x${ogH} but ${path} is ${size?.w}x${size?.h}`);
  }
}

const referenced = new Set();
const note = (p) => { if (p && !/^(https?:|mailto:|data:|#)/.test(p)) referenced.add(p.split('?')[0].replace(/^\//, '')); };

for (const m of [html, ...allPages.map((o) => o.html)].join('\n').matchAll(/(?:href|src)="([^"]+)"/g)) note(m[1].split('#')[0]);
for (const m of html.matchAll(/content="https:\/\/schoolstack\.ai\/([^"]+\.(?:png|svg|webp|ico))"/g)) note(m[1]);
for (const i of manifest.icons) note(i.src);
for (const m of read('fonts/fonts.css').matchAll(/url\(([^)]+)\)/g)) {
  const href = m[1].replace(/['"]/g, '').split('?')[0];
  note(href.startsWith('/') ? href : join('fonts', href));
}

const missing = [...referenced].filter((p) => !p.startsWith('go/')
  && !existsSync(join(ROOT, p)) && !existsSync(join(ROOT, p + '.html')));
console.log(`Referenced files: ${referenced.size}, missing: ${missing.length || 'none'}`);
for (const p of missing) fail(`${p} is referenced but is not in the repo`);

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

const voice = voiceFaults(html);
const ratchet = KNOWN_DEBT.entitlement === 0
  ? `entitlement framing: ${voice.debt.length || 'none'}`
  : `entitlement debt ${voice.debt.length}/${KNOWN_DEBT.entitlement}`;
console.log(`\nVoice: ${voice.faults.length || 'no'} fault(s), ${ratchet}`);
for (const f of voice.faults) fail(f);
for (const o of allPages) {
  const v = voiceFaults(o.html);
  console.log(`Voice on ${o.f}: ${v.faults.length || 'no'} fault(s), "deserves" on ${v.debt.length} line(s)`);
  for (const f of v.faults) fail(`${o.f}: ${f}`);
  if (v.debt.length) fail(`${o.f} carries "deserves" on line(s) ${v.debt.map((d) => d.line).join(', ')} - CLAUDE.md retires it`);
}

if (voice.debt.length) {
  console.log(`  "deserves" on ${voice.debt.length} line(s) - CLAUDE.md retires it:`);
  for (const d of voice.debt) console.log(`    line ${d.line}: ${d.text.slice(0, 96)}`);
}

const dangling = [
  ...danglingAnchors(html),
  ...allPages.flatMap((o) => danglingAnchors(o.html, html).map((d) => ({ ...d, target: `${d.target} (${o.f})` }))),
];
const unsafe = [...unsafeBlankLinks(html), ...allPages.flatMap((o) => unsafeBlankLinks(o.html))];
const wanted = declaredFontFamilies(siteCss);
const drift = others.flatMap((o) => chromeDrift(html, o.html).map((d) => `${d} (index.html vs ${o.f})`));
const served = servedFontFamilies(read('fonts/fonts.css'));

console.log(`Anchors: ${dangling.length || 'none'} dangling  |  target=_blank without noopener: ${unsafe.length || 'none'}`);

const retired = [{ f: 'index.html', html }, ...allPages].flatMap((o) => retiredAnchorLinks(o.html).map((r) => ({ ...r, f: o.f })));
console.log(`Retired anchors linked: ${retired.length || 'none'}`);
for (const r of retired) fail(`${r.f}:${r.line} links to #${r.id}, a retired id kept only for old links; link to #${r.use}`);

const assetRefs = [{ html }, ...allPages].flatMap((o) => [...o.html.matchAll(/(?:src|href|poster|content)="\/(assets\/[^"?#]+)"/g)].map((m) => m[1]));
const assetProblems = assetHashDrift(assetRefs, (p) => readFileSync(join(ROOT, p)), (b) => createHash('sha256').update(b).digest('hex'));
console.log(`Assets: ${new Set(assetRefs).size} referenced from /assets, ${assetProblems.length ? assetProblems.length + ' named wrongly' : 'each named by its own content hash'}`);
for (const p of assetProblems) fail(p);
const staleVersions = VERSIONED_PAGES.flatMap((f) => versionDrift(read(f), ROOT).map((d) => ({ ...d, f })));
const bareImages = VERSIONED_PAGES.flatMap((f) => unversionedImages(read(f)).map((r) => ({ ...r, f })));
console.log(`Icon, card and image versions: ${staleVersions.length + bareImages.length ? (staleVersions.length + bareImages.length) + ' out of date or missing' : 'each matches its file'}`);
for (const d of staleVersions) fail(`${d.f}: ${d.file}?v=${d.has} should be ?v=${d.want}, its content hash; run node tools/stamp-versions.mjs`);
for (const r of bareImages) fail(`${r.f}:${r.line} loads ${r.ref} with no ?v=, so a replaced image stays cached for a week; add ?v= and run node tools/stamp-versions.mjs`);
const relative = [{ f: 'index.html', html }, ...allPages].flatMap((o) => relativeFileRefs(o.html).map((r) => ({ ...r, f: o.f })));
for (const r of relative) fail(`${r.f}:${r.line} loads "${r.ref}" relative to the page; write it from the site root, "/${r.ref}", so the file has one URL`);
console.log(`Fonts: page asks for ${Object.values(wanted).join(' + ')}, fonts.css serves ${[...served].join(' + ')}`);

console.log(`Shared nav and footer: ${drift.length ? 'DRIFTED' : 'identical'} on index.html and ${OTHER_PAGES.join(', ')}`);

const privacyHtml = read('privacy.html');
const formDrift = FORMS.map((f) => ({ ...f, ...privacyFieldDrift(html, privacyHtml, f) }));
const fields = { unlisted: formDrift.flatMap((f) => f.unlisted), stale: formDrift.flatMap((f) => f.stale) };
const cookieFiles = ['index.html', ...OTHER_PAGES, ...TOOL_PAGES, 'js/site.js', 'js/budget-calculator.js', 'js/enrollment-audit.js', '_headers']
  .filter((f) => cookieUse(read(f)));
console.log(`Privacy policy: form fields ${fields.unlisted.length || fields.stale.length ? 'DRIFTED' : 'match'}, cookies ${cookieFiles.length ? 'IN USE' : 'none'}`);
for (const f of formDrift) {
  for (const x of f.unlisted) fail(`${f.label} collects "${x}" but privacy.html does not list it - add it to its data-form="${f.name}" list`);
  for (const x of f.stale) fail(`privacy.html lists "${x}" for ${f.label}, which no longer collects it`);
}
for (const f of cookieFiles) fail(`${f} sets or reads a cookie, but privacy.html promises the site sets none`);
for (const d of drift) fail(`the ${d} - the nav and footer are written out on each page and must match`);
for (const d of dangling) {
  fail(`href="#${d.target}" on line(s) ${d.lines.join(', ')} points at an id that does not exist - the link scrolls nowhere`);
}
for (const u of unsafe) {
  fail(`line ${u.line} opens a new tab without rel="noopener": ${u.tag}`);
}
for (const [role, family] of Object.entries(wanted)) {
  check(served.has(family),
    `--font-${role} asks for '${family}' but fonts/fonts.css serves no such @font-face - the page would render in the fallback with every other check green`);
}

const { counts: comments, unreadable } = commentScan(ROOT);
const commentTotal = Object.values(comments).reduce((a, b) => a + b, 0);
console.log(`Comments: ${commentTotal || 'none'}${commentTotal ? ` in ${Object.keys(comments).length} file(s), the recorded debt` : ''}`);
for (const [f, n] of Object.entries(comments)) console.log(`  ${f}: ${n}`);
for (const d of commentDrift(comments)) fail(d);
for (const u of unreadable) fail(u);

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log('\nAll content checks passed');
