/**
 * Tests for the landing-page budget calculator.
 *
 * They load js/budget-calculator.js itself, the file the browser runs, so
 * there is one implementation of the arithmetic and it is the one under test.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const calc = require('../../js/budget-calculator.js');
const { calculate, parseTuition, parseStudents, barSegments, formatUSD, DEFAULTS, MESSAGES } = calc;

const run = (over = {}) => calculate({ ...DEFAULTS, ...over });

/* ---------------------------------------------------------------------------
   The worked examples from the brief
   --------------------------------------------------------------------------- */

test('defaults: $10,000 x 50 students is $500,000, split 15 / 60 / 25', () => {
  const r = run();
  assert.equal(r.revenue.annual, 500000);
  assert.equal(r.facilities.annual, 75000);
  assert.equal(r.facilities.monthly, 6250);
  assert.equal(r.staffing.annual, 300000);
  assert.equal(r.staffing.monthly, 25000);
  assert.equal(r.remaining.pct, 25);
  assert.equal(r.remaining.annual, 125000);
  assert.equal(formatUSD(r.remaining.monthly), '$10,417');
  assert.equal(r.status, 'ok');
  assert.equal(r.message, '');
});

/* ---------------------------------------------------------------------------
   The edge cases the brief names
   --------------------------------------------------------------------------- */

test('zero enrollment gives zero dollars everywhere, and percentages still add up', () => {
  const r = run({ students: 0 });
  assert.equal(r.revenue.annual, 0);
  assert.equal(r.facilities.annual, 0);
  assert.equal(r.staffing.annual, 0);
  assert.equal(r.remaining.annual, 0);
  assert.equal(r.remaining.pct, 25);
  assert.equal(r.status, 'ok');
});

test('zero tuition gives zero dollars everywhere', () => {
  const r = run({ tuition: 0 });
  assert.equal(r.revenue.annual, 0);
  assert.equal(r.remaining.annual, 0);
  assert.equal(formatUSD(r.revenue.annual), '$0');
});

test('decimal tuition is exact to the cent, with no floating-point dust', () => {
  const r = run({ tuition: 10000.5, students: 50 });
  assert.equal(r.revenue.annual, 500025);
  // 0.1 + 0.2 territory: $0.10 x 3 must be $0.30, not 0.30000000000000004.
  assert.equal(run({ tuition: 0.1, students: 3 }).revenue.annual, 0.3);
  // The three parts always sum back to revenue exactly.
  const odd = run({ tuition: 9999.99, students: 37, facilitiesPct: 17, staffingPct: 59 });
  const sum = Math.round((odd.facilities.annual + odd.staffing.annual + odd.remaining.annual) * 100);
  assert.equal(sum, Math.round(odd.revenue.annual * 100));
});

test('exactly 100% allocated: nothing remains, no deficit, flagged as tight', () => {
  const r = run({ facilitiesPct: 40, staffingPct: 60 });
  assert.equal(r.remaining.pct, 0);
  assert.equal(r.remaining.annual, 0);
  assert.equal(r.status, 'tight');
  assert.equal(r.message, MESSAGES.tight);
  assert.deepEqual(r.bar, { facilities: 40, staffing: 60, remaining: 0, deficit: 0, revenueMark: 100 });
});

test('over 100% allocated: a negative remainder, the over-revenue warning, no negative bar', () => {
  const r = run({ facilitiesPct: 40, staffingPct: 90 });
  assert.equal(r.allocatedPct, 130);
  assert.equal(r.remaining.pct, -30);
  assert.equal(r.remaining.annual, -150000);
  assert.equal(r.remaining.monthly, -12500);
  assert.equal(r.status, 'over');
  assert.equal(r.message, MESSAGES.over);
  assert.equal(formatUSD(r.remaining.annual), '−$150,000');
  for (const [k, v] of Object.entries(r.bar)) assert.ok(v >= 0, `bar segment ${k} is ${v}`);
});

test('the tight warning starts below 15% remaining, not at it', () => {
  assert.equal(run({ facilitiesPct: 25, staffingPct: 60 }).status, 'ok');     // 15% left
  assert.equal(run({ facilitiesPct: 26, staffingPct: 60 }).status, 'tight');  // 14% left
  assert.equal(run({ facilitiesPct: 40, staffingPct: 61 }).status, 'over');   // -1%
});

/* ---------------------------------------------------------------------------
   No benchmarks. The starting allocations are illustrations to adjust, so the
   result carries no verdict about any one percentage, and no message reads a
   remainder as proof of financial health.
   --------------------------------------------------------------------------- */

test('no percentage is judged against a ceiling or benchmark', () => {
  const r = run({ facilitiesPct: 30 });
  assert.equal('facilitiesAboveCeiling' in r, false);
  // Facilities at 30% with 40% staffing leaves 30%: nothing to flag.
  assert.equal(run({ facilitiesPct: 30, staffingPct: 40 }).status, 'ok');
});

test('the messages describe the inputs and never call a mix healthy', () => {
  assert.match(MESSAGES.over, /tuition and funding entered/);
  for (const m of Object.values(MESSAGES)) {
    assert.ok(!/healthy|sustainab|program\b/i.test(m), `"${m}"`);
  }
});

/* ---------------------------------------------------------------------------
   The bar
   --------------------------------------------------------------------------- */

test('the bar fills the track exactly and never goes negative', () => {
  for (let f = 0; f <= 40; f += 1) {
    for (let s = 0; s <= 90; s += 1) {
      const b = barSegments(f, s);
      const total = b.facilities + b.staffing + b.remaining;
      assert.ok(Math.abs(total - 100) < 0.05, `${f}/${s} fills ${total}%`);
      assert.ok(Object.values(b).every((v) => v >= 0), `${f}/${s} has a negative segment`);
      // The deficit overlay runs from the revenue mark to the end, no further.
      assert.ok(Math.abs(b.revenueMark + b.deficit - 100) < 0.05, `${f}/${s} overlay misses the end`);
    }
  }
});

test('over 100%, the revenue mark sits where revenue ends on the rescaled track', () => {
  const b = barSegments(40, 85); // 125% allocated
  assert.equal(b.revenueMark, 80);
  assert.equal(b.deficit, 20);
  assert.equal(b.remaining, 0);
});

/* ---------------------------------------------------------------------------
   Input validation
   --------------------------------------------------------------------------- */

test('tuition accepts the ways people type money', () => {
  for (const [raw, want] of [['10000', 10000], ['10,000', 10000], ['$10,000.50', 10000.5],
    [' 9500 ', 9500], ['0', 0], ['.5', 0.5], ['12.345', 12.35]]) {
    assert.deepEqual(parseTuition(raw), { value: want, error: null }, raw);
  }
});

test('tuition rejects empty, negative, non-numeric and excessive values', () => {
  for (const raw of ['', '   ', '-5', '-0.01', 'abc', '10k', '1e5', '1.2.3', '$', '1000001', '99999999999999999999']) {
    const r = parseTuition(raw);
    assert.equal(r.value, null, `"${raw}" was accepted as ${r.value}`);
    assert.ok(r.error, `"${raw}" has no error message`);
  }
});

test('students accepts whole numbers only', () => {
  assert.deepEqual(parseStudents('50'), { value: 50, error: null });
  assert.deepEqual(parseStudents('1,200'), { value: 1200, error: null });
  assert.deepEqual(parseStudents('50.0'), { value: 50, error: null });
  assert.deepEqual(parseStudents('0'), { value: 0, error: null });
  for (const raw of ['', '-1', '12.5', 'twelve', '1e3', '10001', '.']) {
    const r = parseStudents(raw);
    assert.equal(r.value, null, `"${raw}" was accepted as ${r.value}`);
    assert.ok(r.error, `"${raw}" has no error message`);
  }
});

test('slider values outside their range are clamped, not trusted', () => {
  const r = calculate({ tuition: 1000, students: 10, facilitiesPct: 99, staffingPct: -5 });
  assert.equal(r.facilities.pct, 40);
  assert.equal(r.staffing.pct, 0);
});

test('no message names a shortfall in a headline voice, and none uses an em dash', () => {
  for (const m of Object.values(MESSAGES)) {
    assert.ok(!/—/.test(m), `em dash in "${m}"`);
    assert.ok(!/\b(can'?t|cannot)\b/i.test(m), `deficit framing in "${m}"`);
  }
});
