import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Given, Then } from '@cucumber/cucumber';

const require = createRequire(import.meta.url);
const calc = require('../../js/budget-calculator.js');

const result = (world) => calc.breakEven(world.beInput);

Given('yearly expenses of {float} and {float} per student', function (expenses, perStudent) {
  this.beInput = { expenses, perStudent };
});

Then(/^the school needs (.+) to break even$/, function (want) {
  const n = result(this).students;
  assert.equal(`${n.toLocaleString('en-US')} ${n === 1 ? 'student' : 'students'}`, want);
});

Then('at that enrollment it collects {word}', function (want) {
  assert.equal(calc.formatUSD(result(this).collected), want);
});

Then('one student fewer would fall short of the expenses', function () {
  const r = result(this);
  assert.ok(r.collected >= r.expenses, 'the count does not cover the year');
  assert.ok((r.students - 1) * r.perStudent < r.expenses,
    'one student fewer still covers the year, so the count is not the minimum');
});
