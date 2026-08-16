#!/usr/bin/env node
/**
 * Serves the site locally with the real _headers rules applied and loads it in
 * headless Chromium, failing on any CSP violation, console error, or missing
 * asset.
 *
 *   node tools/verify-headers.mjs
 *
 * A Content-Security-Policy is the one header that can silently break a page in
 * production: Netlify applies it at the edge, so nothing in local development
 * or in `git diff` will tell you the policy blocked your own stylesheet. Run
 * this whenever _headers or any inline script or style changes.
 *
 * Every finding here is an absence - no violations, no console errors, no 4xx -
 * which is also exactly what a page that never loaded produces. So the run also
 * asserts a floor (POLICY and FLOOR below): the headers have to carry the values
 * that make them worth having, not merely exist, and the page behind them has to
 * have actually rendered.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, serveSite, launchBrowser, sleep } from './lib/harness.mjs';

/* ---------------------------------------------------------------------------
   Parse _headers - Netlify's format: a path pattern, then indented `Key: value`
   lines until the next unindented line.
   --------------------------------------------------------------------------- */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const idx = line.indexOf(':');
      if (idx > 0) current.headers.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, path) {
  const rx = new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return rx.test(path);
}

const rules = existsSync(join(ROOT, '_headers')) ? parseHeaders(readFileSync(join(ROOT, '_headers'), 'utf8')) : [];
if (!rules.length) {
  console.error('No _headers rules found - nothing to verify.');
  process.exit(1);
}

/* Presence is not protection: `X-Frame-Options: ALLOWALL` is present, and a CSP
   mangled down to `default-src *` is present. These say what each header has to
   MEAN. Kept as properties rather than exact strings so _headers stays the one
   place the policy is written, and this stays the place it is judged. */
const POLICY = {
  'x-frame-options': [(v) => /^(DENY|SAMEORIGIN)$/i.test(v), 'must be DENY or SAMEORIGIN'],
  'x-content-type-options': [(v) => /^nosniff$/i.test(v), 'must be nosniff'],
  'referrer-policy': [(v) => /no-referrer|strict-origin/i.test(v), 'must not send full URLs cross-site'],
  'permissions-policy': [
    (v) => ['camera', 'microphone', 'geolocation'].every((f) => new RegExp(`${f}=\\(\\)`, 'i').test(v)),
    'must switch off camera, microphone and geolocation',
  ],
  'strict-transport-security': [
    (v) => Number(v.match(/max-age=(\d+)/)?.[1] ?? 0) >= 31536000,
    'max-age must be at least a year',
  ],
  'content-security-policy': [(v) => cspFaults(v).length === 0, 'see the faults listed below'],
};

/* The directives that carry the weight. A policy that loses one of these is
   still a policy, still present, and no longer doing the job. */
function cspFaults(value) {
  const directives = new Map(
    value.split(';').map((part) => part.trim().split(/\s+/)).filter(([n]) => n)
      .map(([name, ...vals]) => [name.toLowerCase(), vals]),
  );
  const faults = [];
  const wants = {
    'default-src': "'self'", 'base-uri': "'self'", 'form-action': "'self'",
    'object-src': "'none'", 'frame-ancestors': "'none'",
  };
  for (const [name, want] of Object.entries(wants)) {
    if (!directives.has(name)) faults.push(`${name} is missing`);
    else if (!directives.get(name).includes(want)) faults.push(`${name} does not include ${want}`);
  }
  for (const [name, vals] of directives) {
    // A wildcard or a plaintext origin anywhere undoes the rest of the policy.
    if (vals.includes('*')) faults.push(`${name} is a wildcard`);
    for (const v of vals.filter((x) => /^http:/i.test(x))) faults.push(`${name} allows plaintext ${v}`);
  }
  if (directives.get('script-src')?.includes("'unsafe-eval'")) faults.push("script-src allows 'unsafe-eval'");
  return faults;
}

/* Absence of errors only counts as a pass if the page was really there. */
const FLOOR = { responses: 10, images: 8, textChars: 4000 };

/* Apply the real _headers rules to every response, which is the whole point:
   these headers exist at Netlify's edge and nowhere in the repo's own output. */
const site = await serveSite({
  headersFor: (path) => {
    const headers = {};
    for (const rule of rules) {
      if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) headers[k] = v;
    }
    return headers;
  },
});
const base = site.base;


/* ---------------------------------------------------------------------------
   Chromium
   --------------------------------------------------------------------------- */
const browser = await launchBrowser();

const violations = [];
const consoleErrors = [];
const failedRequests = [];
let responsesSeen = 0;

browser.on((m) => {
  switch (m.method) {
    case 'Log.entryAdded': {
      const e = m.params.entry;
      // CSP refusals surface here with source "security", not as page errors.
      if (e.level === 'error' || e.source === 'security') {
        (/Content Security Policy|Refused to/i.test(e.text) ? violations : consoleErrors).push(e.text);
      }
      break;
    }
    case 'Runtime.consoleAPICalled':
      if (m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
      break;
    case 'Runtime.exceptionThrown':
      consoleErrors.push(m.params.exceptionDetails.text);
      break;
    case 'Network.responseReceived':
      responsesSeen++;
      if (m.params.response.status >= 400) failedRequests.push(`${m.params.response.status} ${m.params.response.url.replace(base, '')}`);
      break;
  }
});

for (const domain of ['Log', 'Runtime', 'Network', 'Page']) {
  await browser.send(`${domain}.enable`);
}
const navError = await browser.navigate(base + '/');
await sleep(5000);

// What the browser ended up with, rather than what it was sent.
const dom = await browser.evaluate(`JSON.stringify({
  title: document.title.trim(),
  images: document.images.length,
  textChars: (document.body.innerText || '').trim().length,
  hasForm: !!document.getElementById('signupForm'),
})`);

// Confirm the headers actually reached the browser rather than trusting the parser.
const probe = await fetch(base + '/');
const probeBody = await probe.text();
const seen = Object.fromEntries(
  ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security']
    .map((h) => [h, probe.headers.get(h)]),
);

await browser.close();
site.close();

console.log('Headers served on /:');
const weak = [];
for (const [k, v] of Object.entries(seen)) {
  if (!v) { console.log(`  MISS ${k} (absent)`); continue; }
  const [holds, requirement] = POLICY[k];
  if (holds(v)) { console.log(`  ok   ${k}`); continue; }
  console.log(`  WEAK ${k} - ${requirement}`);
  weak.push(`${k}: ${requirement}`);
  if (k === 'content-security-policy') for (const f of cspFaults(v)) weak.push(`  csp: ${f}`);
}
const missing = Object.entries(seen).filter(([, v]) => !v).map(([k]) => k);

/* The floor. Everything above this line reports on what the browser saw; none
   of it can tell a clean page from an absent one. */
const short = [];
if (navError) short.push(`navigation failed: ${navError}`);
if (probe.status !== 200) short.push(`/ answered ${probe.status}, expected 200`);
if (!probeBody.includes('id="signupForm"')) short.push('/ did not serve the signup form');
if (responsesSeen < FLOOR.responses) short.push(`only ${responsesSeen} responses, expected at least ${FLOOR.responses}`);
if (!dom.title) short.push('the rendered page has no <title>');
if (!dom.hasForm) short.push('#signupForm is not in the rendered page');
if (dom.images < FLOOR.images) short.push(`${dom.images} images rendered, expected at least ${FLOOR.images}`);
if (dom.textChars < FLOOR.textChars) short.push(`${dom.textChars} characters of copy, expected at least ${FLOOR.textChars}`);

console.log(`\nPage behind them: ${responsesSeen} responses, ${dom.images} images, `
  + `${dom.textChars} chars of copy, form ${dom.hasForm ? 'present' : 'MISSING'}`);

console.log(`\nCSP violations:  ${violations.length || 'none'}`);
violations.forEach((v) => console.log('  ! ' + v));
console.log(`console errors:  ${consoleErrors.length || 'none'}`);
consoleErrors.forEach((v) => console.log('  ! ' + v));
console.log(`failed requests: ${failedRequests.length || 'none'}`);
failedRequests.forEach((v) => console.log('  ! ' + v));

if (weak.length) {
  console.log(`\nheaders too weak to count: ${weak.length}`);
  weak.forEach((w) => console.log('  ! ' + w));
}
if (short.length) {
  console.log(`\nfloor not met: ${short.length}`);
  short.forEach((f) => console.log('  ! ' + f));
  console.log('\nA clean report over a page that did not load is not a pass.');
}

const bad = violations.length + consoleErrors.length + failedRequests.length
  + missing.length + weak.length + short.length;
console.log(bad ? '\nFAILED' : '\nAll header checks passed');
process.exit(bad ? 1 : 0);
