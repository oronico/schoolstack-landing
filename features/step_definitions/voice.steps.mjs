/**
 * Voice steps. Every assertion delegates to tools/lib/copy-rules.mjs, the same
 * module verify-content.mjs and the unit tests call.
 */

import assert from 'node:assert/strict';
import { Given, Then } from '@cucumber/cucumber';
import { ctx } from '../support/world.mjs';
import { voiceFaults, KNOWN_DEBT, DISCLAIMER } from '../../tools/lib/copy-rules.mjs';

/* A sample needs the disclaimer to isolate the rule under test, otherwise
   every Scenario Outline row also trips the missing-disclaimer rule. */
const DISCLAIMER_LINE = '<p>Estimates in our tools are for planning only and are not loan eligibility.</p>';

Given('the published page', function () {
  this.sample = ctx.html;
});

/* The surface is named rather than hand-written as markup: a Gherkin {string}
   is delimited by quotes, so an Examples cell cannot carry the double quotes a
   raw <meta ... content="..."> needs. Naming the surface reads as intent and
   keeps the wrapper in one place. */
const SURFACES = {
  headline: (t) => `<h1>${t}</h1>`,
  CTA: (t) => `<button>${t}</button>`,
  'og:title': (t) => `<meta property="og:title" content="${t}">`,
  body: (t) => `<p>${t}</p>`,
};

Given('a {word} that reads {string}', function (surface, copy) {
  const wrap = SURFACES[surface];
  assert.ok(wrap, `unknown surface "${surface}"; known: ${Object.keys(SURFACES).join(', ')}`);
  this.sample = `${wrap(copy)}\n${DISCLAIMER_LINE}`;
});

const faultsOf = (world) => voiceFaults(world.sample).faults;

Then('the copy carries no deficit framing where a reader meets it first', function () {
  const hits = faultsOf(this).filter((f) => /deficit framing/.test(f));
  assert.deepEqual(hits, [], `deficit framing found:\n  ${hits.join('\n  ')}`);
});

Then('the copy carries no em dash', function () {
  const hits = faultsOf(this).filter((f) => /em dash/.test(f));
  assert.deepEqual(hits, [], `em dashes found:\n  ${hits.join('\n  ')}`);
});

Then('the copy claims no number of schools already using SchoolStack', function () {
  const hits = faultsOf(this).filter((f) => /user counts/.test(f));
  assert.deepEqual(hits, [], `invented counts found:\n  ${hits.join('\n  ')}`);
});

Then('the copy still carries the planning-only disclaimer', function () {
  assert.ok(DISCLAIMER.test(this.sample.replace(/\s+/g, ' ')),
    'CLAUDE.md keeps the planning-only disclaimer wherever numbers appear');
});

Then('entitlement framing appears on no more lines than the recorded debt', function () {
  const { debt } = voiceFaults(this.sample);
  assert.ok(debt.length <= KNOWN_DEBT.entitlement,
    `entitlement framing is on ${debt.length} lines, up from the recorded ${KNOWN_DEBT.entitlement}. `
    + 'CLAUDE.md retires it; do not raise KNOWN_DEBT to get green.');
});

Then('every remaining line is named in the run output', function () {
  const { debt } = voiceFaults(this.sample);
  // The ratchet only turns if someone can see what is left to fix.
  for (const d of debt) {
    assert.ok(d.line > 0 && d.text, 'each remaining instance reports a line and its text');
  }
  if (debt.length) {
    console.log(`    entitlement debt, ${debt.length} line(s):`);
    for (const d of debt) console.log(`      line ${d.line}: ${d.text.slice(0, 88)}`);
  }
});

Then('the voice check reports a fault matching {string}', function (needle) {
  const hits = faultsOf(this);
  assert.ok(hits.some((f) => f.includes(needle)),
    `expected a fault mentioning "${needle}", got:\n  ${hits.join('\n  ') || '(none)'}`);
});

Then('the voice check reports no fault', function () {
  const hits = faultsOf(this);
  assert.deepEqual(hits, [], `expected honest copy to pass, got:\n  ${hits.join('\n  ')}`);
});
