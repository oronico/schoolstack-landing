#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, serveSite, launchBrowser, sleep } from './lib/harness.mjs';
import { parseHeaders, headersFor, cspFaults } from './lib/netlify.mjs';

const rules = existsSync(join(ROOT, '_headers')) ? parseHeaders(readFileSync(join(ROOT, '_headers'), 'utf8')) : [];
if (!rules.length) {
  console.error('No _headers rules found - nothing to verify.');
  process.exit(1);
}

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

const FLOOR = { responses: 10, images: 8, textChars: 4000 };

const site = await serveSite({ headersFor: (path) => headersFor(rules, path) });
const base = site.base;

const browser = await launchBrowser();

const violations = [];
const consoleErrors = [];
const failedRequests = [];
let responsesSeen = 0;

browser.on((m) => {
  switch (m.method) {
    case 'Log.entryAdded': {
      const e = m.params.entry;
      if (/^Error with Permissions-Policy header: Unrecognized feature: 'interest-cohort'\.$/.test(e.text)) break;
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

const dom = await browser.evaluate(`JSON.stringify({
  title: document.title.trim(),
  images: document.images.length,
  textChars: (document.body.innerText || '').trim().length,
  hasForm: !!document.getElementById('signupForm'),
})`);

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
