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
const { calculate, parseTuition, parseStudents, parseFreeSeats, barSegments, formatUSD, DEFAULTS, MESSAGES } = calc;

// Full tuition from every student, so the allocation arithmetic below can be
// read against round numbers. Free seats and discounts have their own tests.
const run = (over = {}) => calculate({ ...DEFAULTS, freeSeats: 0, discountPct: 0, ...over });

/* ---------------------------------------------------------------------------
   The worked examples from the brief
   --------------------------------------------------------------------------- */

test('the page defaults: 2 free seats and a 10% discount turn $500,000 into $432,000', () => {
  const r = calculate(DEFAULTS);
  assert.equal(r.full.annual, 500000);
  assert.equal(r.paying, 48);
  assert.equal(r.revenue.annual, 432000);          // 48 x $10,000 x 90%
  assert.equal(r.revenue.monthly, 36000);
  assert.equal(r.givenUp.annual, 68000);
  assert.equal(r.perStudent, 8640);
  assert.equal(r.facilities.annual, 64800);        // 15% of what is collected
  assert.equal(r.staffing.annual, 259200);
  assert.equal(r.remaining.annual, 108000);
  assert.equal(r.status, 'ok');
  assert.equal(r.facilitiesAboveCeiling, false);
});

test('full pay: $10,000 x 50 students is $500,000, split 15 / 60 / 25', () => {
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
   Free seats and discounts
   --------------------------------------------------------------------------- */

test('percentages are taken from collected tuition, not the sticker price', () => {
  const r = run({ discountPct: 20 });
  assert.equal(r.full.annual, 500000);
  assert.equal(r.revenue.annual, 400000);
  assert.equal(r.facilities.annual, 60000);
  assert.equal(r.givenUp.pct, 20);
});

test('free seats pay nothing and the discount applies only to students who pay', () => {
  const r = run({ freeSeats: 5, discountPct: 10 });
  assert.equal(r.paying, 45);
  assert.equal(r.revenue.annual, 405000);          // 45 x $10,000 x 90%
  assert.equal(r.givenUp.annual, 95000);
});

test('every seat free means nothing collected, and no division by zero', () => {
  const r = run({ freeSeats: 50 });
  assert.equal(r.revenue.annual, 0);
  assert.equal(r.perStudent, 0);
  assert.equal(r.remaining.annual, 0);
  assert.equal(run({ students: 0, freeSeats: 0 }).perStudent, 0);
});

test('more free seats than students are capped at enrollment by the math', () => {
  assert.equal(run({ students: 10, freeSeats: 40 }).paying, 0);
});

test('free seats are refused when they outnumber enrollment', () => {
  assert.deepEqual(parseFreeSeats('2', 50), { value: 2, error: null });
  assert.deepEqual(parseFreeSeats('50', 50), { value: 50, error: null });
  const over = parseFreeSeats('51', 50);
  assert.equal(over.value, null);
  assert.match(over.error, /no more free seats than students enrolled \(50\)/);
  for (const raw of ['', '-1', '1.5', 'two']) assert.equal(parseFreeSeats(raw, 50).value, null, raw);
});

test('facilities above 15% are flagged against the suggested ceiling', () => {
  assert.equal(run({ facilitiesPct: 15 }).facilitiesAboveCeiling, false);
  assert.equal(run({ facilitiesPct: 16 }).facilitiesAboveCeiling, true);
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
