/**
 * Signup steps. The submit driver is tools/lib/form-scenario.mjs, the same
 * module verify-form.mjs uses, so both suites stub fetch identically.
 */

import assert from 'node:assert/strict';
import { When, Then } from '@cucumber/cucumber';
import { ctx, loadPage } from '../support/world.mjs';
import { scenario } from '../../tools/lib/form-scenario.mjs';

const MODE_FOR = {
  'the submission succeeds': 'ok',
  'the server answers 500': 'server-error',
  'the network drops': 'network-error',
  'the request never settles': 'in-flight',
};

/* Each scenario submits once, so the page is reloaded first: a form already
   replaced by its confirmation cannot be submitted again. */
When('a visitor submits the form and {}', async function (outcome) {
  const mode = MODE_FOR[outcome];
  assert.ok(mode, `unknown outcome "${outcome}"`);
  await loadPage(1440);
  this.result = await ctx.browser.evaluate(scenario(mode), { awaitPromise: true });
});

When('a visitor submits the form empty', async function () {
  await loadPage(1440);
  this.result = await ctx.browser.evaluate(scenario('ok', { fill: false }), { awaitPromise: true });
});

/* --- the Netlify contract, read off the rendered DOM ----------------------- */

const attr = async (sel, name) => ctx.browser.evaluate(
  `JSON.stringify(document.querySelector(${JSON.stringify(sel)})?.getAttribute(${JSON.stringify(name)}) ?? null)`);

Then('the form is named {string}', async function (name) {
  assert.equal(await attr('#signupForm', 'name'), name,
    'Netlify pairs a submission to a form by this name');
});

Then('it posts with a hidden form-name of {string}', async function (name) {
  const method = await attr('#signupForm', 'method');
  assert.equal((method || '').toUpperCase(), 'POST');
  assert.equal(await attr('#signupForm input[name="form-name"]', 'value'), name,
    'if this stops matching the form name, Netlify answers 200 and discards the lead');
});

Then('it declares a honeypot field', async function () {
  const field = await attr('#signupForm', 'netlify-honeypot');
  assert.ok(field, 'the form declares no honeypot');
  const exists = await ctx.browser.evaluate(
    `JSON.stringify(!!document.querySelector('#signupForm [name=${JSON.stringify(field)}]'))`);
  assert.ok(exists, `the honeypot is declared as "${field}" but no such input exists`);
});

/* --- what the page did ----------------------------------------------------- */

Then('exactly one request is sent', function () {
  assert.equal(this.result.calls.length, 1);
});

Then('no request is sent', function () {
  assert.equal(this.result.calls.length, 0,
    'the browser should refuse to submit a form with empty required fields');
});

Then('the request is a POST of urlencoded fields to {string}', function (path) {
  const [call] = this.result.calls;
  assert.equal(call.method, 'POST');
  assert.equal(new URL(call.url, 'http://x').pathname, path);
  assert.ok((call.contentType || '').startsWith('application/x-www-form-urlencoded'),
    `submitted as ${call.contentType || 'no content type'}`);
});

Then('the posted body carries form-name {string}', function (name) {
  const body = new URLSearchParams(this.result.calls[0].body);
  assert.equal(body.get('form-name'), name, 'the field Netlify routes on must survive FormData');
});

Then('the form is replaced by the confirmation', function () {
  assert.equal(this.result.formShown, false, 'the form is still shown');
  assert.equal(this.result.successShown, true, 'the confirmation is missing');
});

Then('an error is shown', function () {
  assert.equal(this.result.errorShown, true, 'no error was shown');
  assert.ok(this.result.errorText.length, 'the error element is empty');
});

Then('the button is usable again with its original label', function () {
  assert.equal(this.result.disabled, false, 'the button is still disabled, so the visitor cannot retry');
  assert.equal(this.result.label, this.result.initialLabel,
    'the handler restores the label from a string literal; it has drifted from the markup');
});

Then('the error names an email address', function () {
  assert.match(this.result.errorText, /@/, 'a dropped network should point the visitor at a human');
});

Then('the button is disabled', function () {
  assert.equal(this.result.disabled, true, 'an in-flight submission can be sent twice');
});

Then('the button reads {string}', function (label) {
  assert.equal(this.result.label, label);
});
