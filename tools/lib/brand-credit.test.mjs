import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import { stripNonCopy } from './copy-rules.mjs';

const read = (f) => readFileSync(join(ROOT, f), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');

const SUPPORT = 'SchoolStack is a nonprofit venture incubated by Building Hope Impact Fund.';
const CREDIT = `${SUPPORT} Founder &amp; Product Developer: Allison Serafin`;
const COPYRIGHT = '&copy; 2026 Building Hope Impact Fund. All rights reserved.';
const PAGES = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'giving.html', '404.html'];
const LEGAL = new Set(['privacy.html', 'terms.html']);

test('every page footer carries the credit and the copyright line', () => {
  for (const f of PAGES) {
    const page = flat(read(f));
    assert.ok(page.includes(CREDIT), `${f}: footer credit`);
    assert.ok(page.includes(COPYRIGHT), `${f}: copyright line`);
  }
});

test('the home and About pages open their owner copy with counsel\'s sentence', () => {
  for (const f of ['index.html', 'about.html']) {
    const page = flat(stripNonCopy(read(f)));
    assert.ok(page.includes('Incubated by Building Hope Impact Fund'), `${f}: "Incubated by" heading`);
    assert.ok(page.includes(SUPPORT.replace('.', '')), `${f}: counsel's sentence`);
  }
});

test('no page uses the old wording', () => {
  for (const f of PAGES) {
    const page = flat(stripNonCopy(read(f)));
    for (const re of [
      /incubated at/i,
      /a product of Building Hope/i,
      /built by Allison/i,
      /designed and built by/i,
      /Product design by/i,
      /&copy; \d{4} SchoolStack\b/,
    ]) {
      assert.doesNotMatch(page, re, `${f}: ${re}`);
    }
    if (!LEGAL.has(f)) assert.doesNotMatch(page, /a program of Building Hope/i, `${f}: "a program of" outside the legal pages`);
  }
});

test('the LICENSE names Building Hope Impact Fund as owner and grants the credit no rights', () => {
  const license = flat(read('LICENSE'));
  assert.ok(license.includes('Copyright (c) 2026 Building Hope Impact Fund. All rights reserved.'));
  assert.ok(license.includes('are owned by Building Hope Impact Fund (the "Owner")'));
  assert.ok(license.includes(
    'Allison Serafin is credited as Founder & Product Developer; the credit grants her no license or other right in the repository.',
  ));
  assert.doesNotMatch(license, /Copyright \(c\) \d{4} Allison Serafin/);
});
