/**
 * Tests for the voice rules.
 *
 * Every rule gets both directions: copy that must pass, and copy that must
 * fail. A rule only tested against the page as it stands today proves nothing -
 * it would still pass if the regex matched nothing at all.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import {
  stripNonCopy, locate, headlines, ctas, shareMeta,
  voiceFaults, KNOWN_DEBT, EM_DASH, USER_COUNT, ENTITLEMENT_WORDS,
} from './copy-rules.mjs';

const page = () => readFileSync(join(ROOT, 'index.html'), 'utf8');

/* ---------------------------------------------------------------------------
   stripNonCopy
   --------------------------------------------------------------------------- */

test('stripNonCopy removes comments, scripts and styles', () => {
  const out = stripNonCopy('<p>keep</p><!-- drop --><style>.a{}</style><script>var x</script>');
  assert.ok(out.includes('keep'));
  assert.ok(!out.includes('drop'));
  assert.ok(!out.includes('var x'));
  assert.ok(!out.includes('.a{}'));
});

test('stripNonCopy keeps the JSON-LD block, which is reader-facing copy', () => {
  // Its FAQ answers must stay identical to the visible FAQ, so they are as much
  // a voice surface as the page. An earlier version stripped every <script>
  // and hid one instance of "deserves".
  const out = stripNonCopy('<script type="application/ld+json">{"text":"deserves"}</script>');
  assert.ok(out.includes('deserves'));
});

test('stripNonCopy preserves line numbers', () => {
  // Removed regions become their own newlines, so a hit reported at line N is
  // at line N of index.html. Without this the h1 was reported 680 lines early.
  const src = 'a\n<!--\nx\ny\n-->\nb';
  const out = stripNonCopy(src);
  assert.equal(out.split('\n').length, src.split('\n').length);
  assert.equal(out.split('\n')[5], 'b');
});

test('locate reports one hit per match with a 1-based line', () => {
  const hits = locate('one\ntwo dash — here\nthree', EM_DASH);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 2);
});

/* ---------------------------------------------------------------------------
   Surface extraction
   --------------------------------------------------------------------------- */

test('headlines reads h1 to h3 and flattens inner markup', () => {
  const out = headlines('<h1>The <em>back</em> office</h1><h4>ignored</h4>');
  assert.deepEqual(out, [{ where: '<h1>', text: 'The back office' }]);
});

test('ctas reads buttons and link CTAs, not ordinary links', () => {
  const out = ctas('<button>Send</button><a class="btn-primary" href="#">Go</a><a href="#">plain</a>');
  assert.deepEqual(out.map((c) => c.text), ['Send', 'Go']);
});

test('shareMeta reads the fields a reader meets before the page', () => {
  const out = shareMeta('<title>T</title><meta property="og:title" content="O">');
  assert.deepEqual(out, [{ where: '<title>', text: 'T' }, { where: 'og:title', text: 'O' }]);
});

/* ---------------------------------------------------------------------------
   The rules, in both directions
   --------------------------------------------------------------------------- */

const clean = '<h1>The back office small schools run on.</h1>'
  + '<p>Estimates in our tools are for planning only and are not loan eligibility.</p>';

test('clean copy raises no faults', () => {
  assert.deepEqual(voiceFaults(clean).faults, []);
});

test('deficit framing in a headline fails', () => {
  const { faults } = voiceFaults(`<h1>The back office your school can't afford to hire</h1>${clean}`);
  assert.equal(faults.length, 1);
  assert.match(faults[0], /can't/);
  assert.match(faults[0], /deficit framing/);
});

test('deficit framing in a CTA fails', () => {
  const { faults } = voiceFaults(`${clean}<button>Cannot wait? Sign up</button>`);
  assert.match(faults[0], /Cannot/);
});

test('deficit framing in share metadata fails, because og:title is a headline', () => {
  const { faults } = voiceFaults(`${clean}<meta property="og:title" content="Can't afford a CFO?">`);
  assert.match(faults[0], /og:title/);
});

test('deficit framing in body copy passes - the rule is scoped to headlines and CTAs', () => {
  assert.deepEqual(voiceFaults(`${clean}<p>You can't be everywhere at once.</p>`).faults, []);
});

test('an em dash fails, and reports its line', () => {
  const { faults } = voiceFaults(`${clean}\n<p>one — two</p>`);
  assert.equal(faults.length, 1);
  assert.match(faults[0], /line 2 carries an em dash/);
});

test('an em dash inside a comment or style passes', () => {
  assert.deepEqual(voiceFaults(`${clean}<!-- a — b --><style>/* c — d */</style>`).faults, []);
});

test('an invented user count fails', () => {
  const { faults } = voiceFaults(`${clean}<p>Join 400 schools already running on SchoolStack.</p>`);
  assert.match(faults[0], /invented user counts/);
});

test('a narrative number is not a user count', () => {
  // The founder's quote says "we met over 100 school founders". True, and not a
  // usage claim. An earlier regex triggered on "over" and failed this line.
  assert.deepEqual(
    voiceFaults(`${clean}<p>Last summer we met over 100 school founders who had quit careers.</p>`).faults,
    []);
});

test('losing the planning-only disclaimer fails', () => {
  const { faults } = voiceFaults('<h1>Fine</h1>');
  assert.equal(faults.length, 1);
  assert.match(faults[0], /planning only/);
});

test('the disclaimer counts even when the footer wraps it across lines', () => {
  const wrapped = '<h1>Fine</h1><p>Estimates in\n  our tools are for planning only and are\n  not loan eligibility.</p>';
  assert.deepEqual(voiceFaults(wrapped).faults, []);
});

/* ---------------------------------------------------------------------------
   The ratchet
   --------------------------------------------------------------------------- */

test('the ratchet is closed: KNOWN_DEBT is zero', () => {
  // It was 8. The copy was rewritten, so the wall is up. If this ever needs
  // raising, the copy is going backwards.
  assert.equal(KNOWN_DEBT.entitlement, 0);
});

test('any entitlement framing is now a fault, and names its line', () => {
  const { faults, debt } = voiceFaults(`${clean}\n<p>the tools you deserve</p>`);
  assert.equal(debt.length, 1);
  assert.equal(faults.length, 1);
  assert.match(faults[0], /entitlement framing/);
  assert.match(faults[0], /line\(s\) 2/);
});

test('the ratchet still counts, so a future debt can be recorded and paid down', () => {
  // The mechanism outlives this one rule: debt entries are always returned,
  // whatever the recorded ceiling, so the next rule to need a ratchet can use
  // the same shape rather than inventing one.
  const lines = Array.from({ length: 3 }, () => '<p>you deserve better</p>').join('\n');
  const { debt } = voiceFaults(`${clean}\n${lines}`);
  assert.equal(debt.length, 3);
  assert.deepEqual(debt.map((d) => d.line), [2, 3, 4]);
});

test('ENTITLEMENT_WORDS matches the forms that actually appear', () => {
  for (const w of ['deserve', 'deserves', 'deserved']) {
    assert.ok(new RegExp(ENTITLEMENT_WORDS.source, 'i').test(w), w);
  }
  assert.ok(!new RegExp(ENTITLEMENT_WORDS.source, 'i').test('undeserving'));
});

/* ---------------------------------------------------------------------------
   The real page
   --------------------------------------------------------------------------- */

test('index.html raises no voice faults', () => {
  assert.deepEqual(voiceFaults(page()).faults, []);
});

test('index.html carries exactly the recorded entitlement debt', () => {
  // If this fails low, the copy improved: lower KNOWN_DEBT in copy-rules.mjs.
  // Never raise it.
  assert.equal(voiceFaults(page()).debt.length, KNOWN_DEBT.entitlement);
});

test('USER_COUNT is anchored to adoption verbs', () => {
  const re = () => new RegExp(USER_COUNT.source, 'gi');
  assert.ok(re().test('trusted by 50 schools'));
  assert.ok(re().test('used by 1,200 founders'));
  assert.ok(!re().test('schools of 10 to 500 students'));
  assert.ok(!re().test('we met over 100 school founders'));
});
