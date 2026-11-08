/**
 * Tests for the break-even card on the landing page.
 *
 * Like budget-calculator.test.mjs, they load js/budget-calculator.js itself,
 * the file the browser runs, so the arithmetic under test is the shipped one.
 * Break-even here is total yearly expenses (debt service in, one-time
 * purchases out) divided by what each student brings in, rounded up to a
 * whole student.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const calc = require('../../js/budget-calculator.js');
const { breakEven, breakEvenSentence, breakEvenFormula, parseExpenses, parsePerStudent, formatUSD, BE_DEFAULTS, BE_LIMITS } = calc;

test('defaults: $600,000 at $10,000 a student is exactly 60 students', () => {
  const r = breakEven(BE_DEFAULTS);
  assert.equal(r.students, 60);
  assert.equal(r.collected, 600000);
  assert.equal(r.cushion, 0);
  assert.equal(r.exact, true);
  assert.equal(breakEvenSentence(r), 'At 60 students you collect $600,000, exactly what a year costs.');
});

test('a remainder rounds UP to the next whole student, never down', () => {
  // $600,001 needs 61 students: 60 would leave the school $1 short.
  const r = breakEven({ expenses: 600001, perStudent: 10000 });
  assert.equal(r.students, 61);
  assert.equal(r.exact, false);
  assert.equal(r.cushion, 9999);
  assert.ok(r.collected >= r.expenses, 'the rounded count must cover the expenses');
  assert.ok((r.students - 1) * r.perStudent < r.expenses, 'one fewer student must fall short');
  assert.equal(breakEvenSentence(r), 'At 61 students you collect $610,000, $9,999 above what a year costs.');
});

test('cents are exact: $12,345.67 per student against $1,000,000', () => {
  const r = breakEven({ expenses: 1000000, perStudent: 12345.67 });
  // 81 x 12,345.67 = 999,999.27, one cent-group short; 82 covers it.
  assert.equal(r.students, 82);
  assert.equal(r.collected, 1012344.94);
  assert.equal(Math.round(r.cushion * 100), 1234494);
});

test('a case where float division lands a hair off a whole number', () => {
  // 0.1 + 0.2 style dust: 700 x $0.70 is $490 exactly in cents.
  const r = breakEven({ expenses: 490, perStudent: 0.7 });
  assert.equal(r.students, 700);
  assert.equal(r.exact, true);
});

test('the working never reads as a different answer than the count', () => {
  // Bugbot, PR #32: $600,000.25 needs 61 students, but whole-dollar rounding
  // printed "$600,000 ÷ $10,000", which reads as exactly 60.
  const r = breakEven({ expenses: 600000.25, perStudent: 10000 });
  assert.equal(r.students, 61);
  assert.equal(breakEvenFormula(r), '$600,000.25 ÷ $10,000 per student, rounded up');
  assert.equal(breakEvenSentence(r), 'At 61 students you collect $610,000, $9,999.75 above what a year costs.');
  // Cents on the per-student side are shown too, and whole figures stay whole.
  const c = breakEven({ expenses: 1000000, perStudent: 12345.67 });
  assert.equal(breakEvenFormula(c), '$1,000,000 ÷ $12,345.67 per student, rounded up');
  assert.equal(breakEvenSentence(c), 'At 82 students you collect $1,012,344.94, $12,344.94 above what a year costs.');
  assert.equal(breakEvenFormula(breakEven(BE_DEFAULTS)), '$600,000 ÷ $10,000 per student');
});

/* Adversarial rows: zero, tiny and huge for each money input. */

test('zero expenses need zero students', () => {
  const r = breakEven({ expenses: 0, perStudent: 10000 });
  assert.equal(r.students, 0);
  assert.equal(r.exact, true);
});

test('a tiny expense still needs one whole student', () => {
  const r = breakEven({ expenses: 0.01, perStudent: 10000 });
  assert.equal(r.students, 1);
  // A cent of expenses leaves a cushion of $9,999.99, shown to the cent.
  assert.equal(breakEvenSentence(r), 'At 1 student you collect $10,000, $9,999.99 above what a year costs.');
});

test('the largest accepted figures stay exact', () => {
  const r = breakEven({ expenses: BE_LIMITS.expenses.max, perStudent: BE_LIMITS.perStudent.min });
  assert.equal(r.students, 50000000);
  assert.equal(r.exact, true);
  const big = breakEven({ expenses: BE_LIMITS.expenses.max, perStudent: BE_LIMITS.perStudent.max });
  assert.equal(big.students, 50);
});

test('zero per-student funding has no answer rather than a divide by zero', () => {
  const r = breakEven({ expenses: 600000, perStudent: 0 });
  assert.equal(r.students, null);
});

test('expenses accept the ways people type money', () => {
  for (const [raw, want] of [['600000', 600000], ['600,000', 600000], ['$600,000.50', 600000.5], [' 950000 ', 950000], ['0', 0]]) {
    assert.deepEqual(parseExpenses(raw), { value: want, error: null }, raw);
  }
});

test('expenses refuse empty, negative, words and too much, and say what to enter', () => {
  for (const raw of ['', '-1', 'six hundred thousand', '50000001']) {
    const r = parseExpenses(raw);
    assert.equal(r.value, null, `"${raw}" was accepted`);
    assert.match(r.error, /^(Enter|Use)\b/, `"${raw}" gave "${r.error}", which does not say what to do`);
  }
  assert.equal(parseExpenses('50000001').error, 'Enter an amount up to ' + formatUSD(50000000) + ' a year.');
});

test('per-student funding must be at least $1, and the message says so', () => {
  assert.deepEqual(parsePerStudent('10,000'), { value: 10000, error: null });
  assert.deepEqual(parsePerStudent('1'), { value: 1, error: null });
  for (const raw of ['0', '0.50', '', '-10', 'ten', '1000001']) {
    const r = parsePerStudent(raw);
    assert.equal(r.value, null, `"${raw}" was accepted`);
    assert.match(r.error, /^(Enter|Use)\b/, `"${raw}" gave "${r.error}"`);
  }
  assert.equal(parsePerStudent('0.50').error, 'Enter at least $1 per student.');
});

test('no break-even copy uses an em dash or a deficit framing', () => {
  const lines = [
    breakEvenSentence(breakEven(BE_DEFAULTS)),
    breakEvenSentence(breakEven({ expenses: 600001, perStudent: 10000 })),
    parseExpenses('').error, parsePerStudent('0').error,
  ];
  for (const m of lines) {
    assert.ok(!/—/.test(m), `em dash in "${m}"`);
    assert.ok(!/\b(can'?t|cannot)\b/i.test(m), `deficit framing in "${m}"`);
  }
});
