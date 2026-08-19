/**
 * Unit tests for the logic that decides what the header check tests against.
 *
 *   node --test tools/lib/
 *
 * A bug here does not turn a check red, it turns a check into a liar: the
 * verifier serves the site with whatever these functions return, so a rule
 * that goes missing in parsing means a page served without that header and
 * then reported as passing. That is the one failure mode the browser-driven
 * checks cannot catch, because from their side everything looks fine.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeaders, matches, headersFor, cspFaults, } from './netlify.mjs';
import { ROOT } from './harness.mjs';

test('parseHeaders reads a pattern and its indented headers', () => {
  const rules = parseHeaders('/*\n  X-Frame-Options: DENY\n  Referrer-Policy: no-referrer\n');
  assert.equal(rules.length, 1);
  assert.equal(rules[0].pattern, '/*');
  assert.deepEqual(rules[0].headers, [['X-Frame-Options', 'DENY'], ['Referrer-Policy', 'no-referrer']]);
});

test('parseHeaders keeps every colon after the first', () => {
  // CSP values are full of them. Splitting on the wrong one truncates the
  // policy, and the site is then verified against a policy nobody serves.
  const [rule] = parseHeaders("/*\n  Content-Security-Policy: default-src 'self'; img-src 'self' data:\n");
  assert.deepEqual(rule.headers, [['Content-Security-Policy', "default-src 'self'; img-src 'self' data:"]]);
});

test('parseHeaders separates consecutive rules', () => {
  const rules = parseHeaders('/*\n  A: 1\n/assets/*\n  B: 2\n');
  assert.deepEqual(rules.map((r) => r.pattern), ['/*', '/assets/*']);
  assert.deepEqual(rules[0].headers, [['A', '1']]);
  assert.deepEqual(rules[1].headers, [['B', '2']]);
});

test('parseHeaders ignores comments, blank lines and trailing whitespace', () => {
  const rules = parseHeaders('# top\n\n/*\n  # inner\n  A: 1   \n\n  B: 2\n');
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0].headers, [['A', '1'], ['B', '2']]);
});

test('parseHeaders drops a header that precedes any pattern', () => {
  assert.deepEqual(parseHeaders('  Orphan: 1\n/*\n  A: 1\n').map((r) => r.pattern), ['/*']);
});

test('matches treats * as any run of characters', () => {
  assert.ok(matches('/*', '/'));
  assert.ok(matches('/*', '/anything/deep.html'));
  assert.ok(matches('/assets/*', '/assets/logos/mark.svg'));
  assert.ok(!matches('/assets/*', '/images/photo.png'));
});

test('matches anchors both ends', () => {
  assert.ok(!matches('/assets/*', '/x/assets/logo.svg'));
  assert.ok(!matches('/index.html', '/index.html.bak'));
});

test('matches escapes regex metacharacters in the pattern', () => {
  // Without escaping, the dot in /*.png is "any character" and this passes,
  // so a rule meant for images silently applies to unrelated paths.
  assert.ok(matches('/*.png', '/icon-192.png'));
  assert.ok(!matches('/*.png', '/iconXpng'));
  assert.ok(matches('/a+b', '/a+b'));
  assert.ok(!matches('/a+b', '/aaab'));
});

test('headersFor merges every matching rule, last one winning', () => {
  const rules = parseHeaders('/*\n  Cache-Control: no-store\n  X: 1\n/assets/*\n  Cache-Control: immutable\n');
  assert.deepEqual(headersFor(rules, '/assets/x.svg'), { 'Cache-Control': 'immutable', X: '1' });
  assert.deepEqual(headersFor(rules, '/index.html'), { 'Cache-Control': 'no-store', X: '1' });
});

const GOOD = "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
  + "form-action 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'";

test('cspFaults accepts a policy that does its job', () => {
  assert.deepEqual(cspFaults(GOOD), []);
});

test('cspFaults names a missing load-bearing directive', () => {
  const faults = cspFaults(GOOD.replace("frame-ancestors 'none'; ", ''));
  assert.deepEqual(faults, ['frame-ancestors is missing']);
});

test('cspFaults catches a directive weakened rather than removed', () => {
  assert.ok(cspFaults(GOOD.replace("object-src 'none'", "object-src 'self'"))
    .includes("object-src does not include 'none'"));
});

test('cspFaults catches a wildcard and a plaintext origin', () => {
  assert.ok(cspFaults(GOOD.replace("object-src 'none'", 'object-src *')).includes('object-src is a wildcard'));
  assert.ok(cspFaults(GOOD.replace("img-src 'self' data:", 'img-src http://cdn.example.com'))
    .includes('img-src allows plaintext http://cdn.example.com'));
});

test("cspFaults catches 'unsafe-eval' while allowing 'unsafe-inline'", () => {
  // unsafe-inline is load-bearing here: the page ships its stylesheet and its
  // form handler inline. unsafe-eval is not, and never should be.
  assert.deepEqual(cspFaults(GOOD), []);
  assert.ok(cspFaults(GOOD.replace("script-src 'self'", "script-src 'unsafe-eval' 'self'"))
    .includes("script-src allows 'unsafe-eval'"));
});

test('the real _headers parses into rules that cover the site', () => {
  const rules = parseHeaders(readFileSync(join(ROOT, '_headers'), 'utf8'));
  assert.ok(rules.length >= 1, '_headers produced no rules');

  const root = headersFor(rules, '/');
  for (const h of ['Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options',
    'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security']) {
    assert.ok(root[h], `/ is served without ${h}`);
  }
  assert.deepEqual(cspFaults(root['Content-Security-Policy']), []);
  assert.match(headersFor(rules, '/assets/logos/mark.svg')['Cache-Control'] || '', /immutable/);
});
