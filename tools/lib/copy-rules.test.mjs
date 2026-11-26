import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import {
  stripNonCopy, locate, headlines, ctas, shareMeta,
  voiceFaults, KNOWN_DEBT, EM_DASH, USER_COUNT, ENTITLEMENT_WORDS,
  RETIRED_CLAIMS, retiredClaimFaults,
} from './copy-rules.mjs';

const page = () => readFileSync(join(ROOT, 'index.html'), 'utf8');

test('beta, closed or not, is a voice fault on the page and in share text', () => {
  const page = (body) => `<html><head><meta name="description" content="${body.meta}"></head><body><p>${body.p}</p>`
    + '<p>Estimates are for planning only and are not loan eligibility.</p></body></html>';
  assert.ok(voiceFaults(page({ meta: 'x', p: 'In closed beta with design partners' })).faults.some((f) => /beta/.test(f)));
  assert.ok(voiceFaults(page({ meta: 'Now in Beta.', p: 'x' })).faults.some((f) => /beta/i.test(f)));
  assert.ok(!voiceFaults(page({ meta: 'x', p: 'Sign up for early access' })).faults.some((f) => /beta/i.test(f)));
  assert.ok(!voiceFaults(page({ meta: 'x', p: '<!-- not "closed beta" in a comment -->' })).faults.some((f) => /beta/i.test(f)));
});

test('stripNonCopy removes comments, scripts and styles', () => {
  const out = stripNonCopy('<p>keep</p><!-- drop --><style>.a{}</style><script>var x</script>');
  assert.ok(out.includes('keep'));
  assert.ok(!out.includes('drop'));
  assert.ok(!out.includes('var x'));
  assert.ok(!out.includes('.a{}'));
});

test('stripNonCopy keeps the JSON-LD block, which is reader-facing copy', () => {
  const out = stripNonCopy('<script type="application/ld+json">{"text":"deserves"}</script>');
  assert.ok(out.includes('deserves'));
});

test('stripNonCopy preserves line numbers', () => {
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

test('the ratchet is paid off: no page may carry entitlement framing', () => {
  assert.equal(KNOWN_DEBT.entitlement, 0);
});

test('entitlement framing is found and named by line', () => {
  const { faults, debt } = voiceFaults(`${clean}\n<p>the tools you deserve</p>`);
  assert.equal(debt.length, 1);
  assert.equal(debt[0].line, 2);
  assert.equal(faults.length, 1);
  assert.match(faults[0], /is back, on line\(s\) 2/);
});

test('the ratchet fails when the count rises above what is recorded', () => {
  const lines = Array.from({ length: KNOWN_DEBT.entitlement + 1 }, () => '<p>you deserve better</p>').join('\n');
  const { faults } = voiceFaults(`${clean}\n${lines}`);
  assert.equal(faults.length, 1);
  assert.match(faults[0], /deserves/);
});

test('ENTITLEMENT_WORDS matches the forms that actually appear', () => {
  for (const w of ['deserve', 'deserves', 'deserved']) {
    assert.ok(new RegExp(ENTITLEMENT_WORDS.source, 'i').test(w), w);
  }
  assert.ok(!new RegExp(ENTITLEMENT_WORDS.source, 'i').test('undeserving'));
});

test('index.html raises no voice faults', () => {
  assert.deepEqual(voiceFaults(page()).faults, []);
});

test('index.html carries exactly the recorded entitlement debt', () => {
  assert.equal(voiceFaults(page()).debt.length, KNOWN_DEBT.entitlement);
});

test('USER_COUNT is anchored to adoption verbs', () => {
  const re = () => new RegExp(USER_COUNT.source, 'gi');
  assert.ok(re().test('trusted by 50 schools'));
  assert.ok(re().test('used by 1,200 founders'));
  assert.ok(!re().test('schools of 10 to 500 students'));
  assert.ok(!re().test('we met over 100 school founders'));
});

test('copy that claims early access is open, or offers it, is a voice fault; signing up is not', () => {
  const page = (body) => `<html><head><meta name="description" content="${body.meta}"></head><body><p>${body.p}</p>`
    + '<p>Estimates are for planning only and are not loan eligibility.</p></body></html>';
  assert.ok(voiceFaults(page({ meta: 'x', p: 'Get early access' })).faults.some((f) => /Sign up for early access/.test(f)));
  assert.ok(voiceFaults(page({ meta: 'x', p: 'Early access now open' })).faults.some((f) => /not open yet/.test(f)));
  assert.ok(voiceFaults(page({ meta: 'Get early access, or use the tools.', p: 'x' })).faults.some((f) => /not open yet/.test(f)));
  assert.ok(!voiceFaults(page({ meta: 'x', p: 'Sign up for early access' })).faults.some((f) => /not open yet/.test(f)));
  assert.ok(!voiceFaults(page({ meta: 'x', p: 'Early access news and product updates' })).faults.some((f) => /not open yet/.test(f)));
});

test('each claim the November 2026 walk retired is a fault if it comes back', () => {
  const lines = [
    'Who are the families near me, and what space fits my school?',
    'Gaps are ranked by their effect on enrollment and by the forces you marked.',
    'Advanced is not required; for a nonprofit, it adds categories that help with Form 990.',
    'census demographics, nearby schools, community organizations and the local zoning office',
  ];
  assert.equal(RETIRED_CLAIMS.length, lines.length);
  for (const line of lines) assert.equal(retiredClaimFaults(line).length, 1, line);
  const wrap = (p) => `<html><body><p>${p}</p><p>Estimates are for planning only and are not loan eligibility.</p></body></html>`;
  assert.ok(voiceFaults(wrap(lines[0])).faults.some((f) => /retired/.test(f)));
  assert.equal(retiredClaimFaults('community organizations, and a web search for the local zoning office').length, 0);
  assert.equal(retiredClaimFaults('Who lives near my school, and how much space do we need?').length, 0);
});
