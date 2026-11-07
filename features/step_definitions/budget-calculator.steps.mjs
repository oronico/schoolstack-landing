/**
 * Budget calculator steps. They load js/budget-calculator.js, the file the
 * page runs, as do tools/lib/budget-calculator.test.mjs and
 * tools/verify-calculator.mjs, so one implementation is checked three ways.
 */

import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Given, Then } from '@cucumber/cucumber';

const require = createRequire(import.meta.url);
const calc = require('../../js/budget-calculator.js');

const result = (world) => calc.calculate({ ...calc.DEFAULTS, ...world.calcInput });

Given('tuition of {float} for {int} students', function (tuition, students) {
  this.calcInput = { ...this.calcInput, tuition, students };
});

Given('{int}% for facilities and {int}% for staffing', function (facilitiesPct, staffingPct) {
  this.calcInput = { ...this.calcInput, facilitiesPct, staffingPct };
});

Then('facilities are flagged as above the ceiling', function () {
  assert.equal(result(this).facilitiesAboveCeiling, true);
});

Then('annual revenue is {word}', function (want) {
  assert.equal(calc.formatUSD(result(this).revenue.annual), want);
});

Then('the remaining budget is {int}% or {word} a year', function (pct, left) {
  const r = result(this);
  assert.equal(r.remaining.pct, pct);
  assert.equal(calc.formatUSD(r.remaining.annual), left.replace(/^-/, '−'));
});

Then('the calculator reads as {string}', function (status) {
  assert.equal(result(this).status, status);
});

Then('no bar segment is narrower than zero', function () {
  for (const [k, v] of Object.entries(result(this).bar)) assert.ok(v >= 0, `${k} is ${v}%`);
});

Then('the deficit runs from the revenue mark to the end of the bar', function () {
  const b = result(this).bar;
  assert.ok(b.deficit > 0, 'no deficit is drawn');
  assert.ok(Math.abs(b.revenueMark + b.deficit - 100) < 0.05,
    `mark at ${b.revenueMark}% plus deficit ${b.deficit}% does not reach the end`);
});

Then('{string} is refused as {word}', function (input, field) {
  const parsers = {
    tuition: calc.parseTuition,
    students: calc.parseStudents,
    expenses: calc.parseExpenses,
    'per-student': calc.parsePerStudent,
  };
  assert.ok(parsers[field], `no field called "${field}"`);
  const r = parsers[field](input);
  assert.equal(r.value, null, `"${input}" was accepted as ${r.value}`);
  assert.ok(r.error, `"${input}" was refused with no message for the founder`);
});
