/**
 * Every working line the calculators print must reproduce the answer they
 * print beside it.
 *
 * The same mistake shipped twice: the arithmetic ran in whole cents while the
 * line showing the working rounded to the dollar, so the page printed a sum
 * that did not add up. Cursor Bugbot caught it on the break-even card (#32,
 * fixed) and on the snapshot (#31, merged unfixed and live until November
 * 2026). This test reads the printed text back, as a visitor would, for
 * amounts with cents, so a third card cannot repeat it.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const calc = require('../../js/budget-calculator.js');
const { calculate, revenueFormula, formatUSDExact, breakEven, breakEvenFormula, DEFAULTS } = calc;

/** "$10,000.50" -> 1000050 (cents). Accepts the minus sign formatUSD prints. */
const cents = (s) => {
  const m = String(s).replace(/[−-]/, '-').match(/-?\$?([\d,]+(?:\.\d{2})?)/);
  assert.ok(m, `no amount in "${s}"`);
  return Math.round(parseFloat(m[1].replace(/,/g, '')) * 100);
};

const TUITIONS = [0.01, 1, 99.99, 9999.99, 10000, 10000.5, 12345.67, 999999.99];
const STUDENTS = [1, 3, 37, 50, 1200];

test('the snapshot working line multiplies out to the printed total', () => {
  for (const tuition of TUITIONS) {
    for (const students of STUDENTS) {
      const r = calculate({ ...DEFAULTS, tuition, students });
      const line = revenueFormula(r);
      const [price, count] = line.split(' × ');
      const n = parseInt(count.replace(/,/g, ''), 10);
      assert.equal(cents(price) * n, cents(formatUSDExact(r.revenue.annual)),
        `"${line}" does not make ${formatUSDExact(r.revenue.annual)}`);
    }
  }
});

test('the break-even working line divides out to the printed student count', () => {
  for (const perStudent of TUITIONS) {
    for (const expenses of [0.01, 1, 600000, 600000.25, 1234567.89]) {
      const r = breakEven({ expenses, perStudent });
      const line = breakEvenFormula(r);
      const [top, rest] = line.split(' ÷ ');
      const needed = Math.ceil(cents(top) / cents(rest));
      assert.equal(needed, r.students, `"${line}" reads as ${needed} students, the card says ${r.students}`);
    }
  }
});
