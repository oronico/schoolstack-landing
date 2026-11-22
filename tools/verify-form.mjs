#!/usr/bin/env node

import { serveSite, launchBrowser, sleep } from './lib/harness.mjs';
import { scenario, ANSWERS } from './lib/form-scenario.mjs';

const SUPPORT_EMAIL = 'allison@schoolstack.ai';

const site = await serveSite();
const browser = await launchBrowser();
await browser.send('Page.enable');

const failures = [];
const fail = (msg) => failures.push(msg);
const check = (ok, msg) => { if (!ok) fail(msg); return ok; };

async function load(path = '/', formId = 'signupForm') {
  const navError = await browser.navigate(site.base + path);
  if (navError) { fail(`navigation failed: ${navError}`); return false; }
  const ready = await browser.evaluate(`(async () => {
    for (let i = 0; i < 100 && document.readyState !== 'complete'; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return JSON.stringify(document.readyState === 'complete' && !!document.getElementById('${formId}'));
  })()`, { awaitPromise: true });
  return check(ready, `${path} loaded but #${formId} never appeared`);
}

if (await load()) {
  const f = await browser.evaluate(`JSON.stringify((() => {
    const form = document.getElementById('signupForm');
    const hidden = form.querySelector('input[type="hidden"][name="form-name"]');
    const potName = form.getAttribute('netlify-honeypot');
    const pot = potName && form.querySelector('[name="' + potName + '"]');
    const labelled = [...form.querySelectorAll('input:not([type="hidden"]), select, textarea')]
      .filter((el) => el.type !== 'checkbox' && el.name !== potName)
      .filter((el) => !(el.id && form.querySelector('label[for="' + el.id + '"]')))
      .map((el) => el.name || el.id || el.tagName);
    return {
      name: form.getAttribute('name'),
      method: (form.getAttribute('method') || '').toUpperCase(),
      netlify: form.hasAttribute('data-netlify'),
      hiddenValue: hidden ? hidden.value : null,
      potName,
      potPresent: !!pot,
      // Whether it renders, not which ancestor carries the display rule: the
      // hiding style can sit anywhere above the field.
      potHidden: pot ? (pot.offsetParent === null && pot.getBoundingClientRect().height === 0) : false,
      required: [...form.querySelectorAll('[required]')].map((el) => el.name),
      platformRequired: !!form.querySelector('[name="accountingPlatform"][required]'),
      potAriaHidden: pot ? !!pot.closest('[aria-hidden="true"]') : false,
      unlabelled: labelled,
      action: form.getAttribute('action'),
    };
  })())`);

  console.log(`Contract: name=${f.name} method=${f.method} data-netlify=${f.netlify} `
    + `form-name="${f.hiddenValue}" honeypot=${f.potName}`);

  check(f.netlify, 'the form has no data-netlify attribute - Netlify will not collect it');
  check(f.method === 'POST', `the form method is ${f.method || 'unset'}, expected POST`);
  check(f.hiddenValue !== null, 'the form has no hidden form-name input - Netlify cannot route the submission');
  check(
    f.hiddenValue === f.name,
    `hidden form-name is "${f.hiddenValue}" but the form is named "${f.name}". `
    + 'Netlify answers 200 and discards the lead when these disagree.',
  );
  check(f.potName ? f.potPresent : true, `netlify-honeypot names "${f.potName}" but no such field exists`);
  check(f.potName ? f.potHidden : true, `the ${f.potName} honeypot is visible to people, not just bots`);
  check(f.potName ? f.potAriaHidden : true, `the ${f.potName} honeypot is not aria-hidden, so a screen reader announces it as a real field`);
  for (const name of ['firstName', 'email', 'schoolName', 'schoolState']) {
    check(f.required.includes(name), `required fields are ${JSON.stringify(f.required)}, expected ${name} among them`);
  }
  check(!f.platformRequired, 'the accounting platform question is required - it must stay optional, so nobody is kept off the early list for skipping it');
  for (const el of f.unlabelled) fail(`the ${el} field has no <label for>`);
}

const run = async (mode, opts) => (await load())
  ? browser.evaluate(scenario(mode, opts), { awaitPromise: true })
  : null;

const ok = await run('ok');
if (ok) {
  console.log(`Success path: ${ok.calls.length} request(s), form ${ok.formShown ? 'still shown' : 'hidden'}, `
    + `confirmation ${ok.successShown ? 'shown' : 'MISSING'}`);
  if (check(ok.calls.length === 1, `a valid submit sent ${ok.calls.length} requests, expected 1`)) {
    const [call] = ok.calls;
    const body = new URLSearchParams(call.body);
    check(call.method === 'POST', `submitted with ${call.method}, expected POST`);
    check(new URL(call.url, 'http://x').pathname === '/', `submitted to ${call.url}, expected /`);
    check(
      (call.contentType || '').startsWith('application/x-www-form-urlencoded'),
      `submitted as ${call.contentType || 'no content type'}, expected application/x-www-form-urlencoded`,
    );
    check(body.get('form-name') === 'early-access',
      `the posted body carries form-name="${body.get('form-name')}", expected "early-access"`);
    for (const [name, value] of Object.entries(ANSWERS)) {
      check(body.get(name) === value, `the posted body carries ${name}="${body.get(name)}", expected "${value}" - the answer was typed and not sent`);
    }
  }
  check(!ok.formShown, 'the form is still on screen after a successful submit');
  check(ok.successShown, 'the confirmation panel never appeared after a successful submit');
  check(ok.state === 'submitted', `after a successful submit #signup reads data-state="${ok.state}", expected "submitted"`);
}

const bad = await run('server-error');
if (bad) {
  console.log(`Server error: error ${bad.errorShown ? 'shown' : 'MISSING'} "${bad.errorText}", `
    + `button ${bad.disabled ? 'STILL DISABLED' : 'usable'}, label "${bad.label}"`);
  check(bad.errorShown && bad.errorText.length > 0, 'a rejected submit showed no error message');
  check(!/failed to fetch|networkerror|load failed/i.test(bad.errorText),
    `a rejected submit showed the browser's own words: "${bad.errorText}"`);
  check(!bad.successShown, 'a rejected submit showed the confirmation panel anyway');
  check(bad.formShown, 'a rejected submit hid the form, leaving nothing to retry with');
  check(bad.state === 'failed', `after a server error #signup reads data-state="${bad.state}", expected "failed"`);
  for (const [name, value] of Object.entries(ANSWERS)) {
    check(bad.values[name] === value, `after a server error ${name} reads "${bad.values[name]}", expected the typed "${value}"`);
  }
  check(bad.errorText.includes(SUPPORT_EMAIL),
    `a rejected submit showed "${bad.errorText}", which does not offer ${SUPPORT_EMAIL} as a way through`);
  check(!bad.disabled, 'the submit button stayed disabled after an error - the visitor cannot retry');
  check(bad.label === bad.initialLabel,
    `the button came back reading "${bad.label}" but the page ships it reading "${bad.initialLabel}"`);
}

const dropped = await run('network-error');
if (dropped) {
  console.log(`Network failure: error ${dropped.errorShown ? 'shown' : 'MISSING'} "${dropped.errorText}"`);
  check(dropped.errorShown && dropped.errorText.length > 0, 'a failed request showed no error message');
  check(!/failed to fetch|networkerror|load failed/i.test(dropped.errorText),
    `a dropped connection showed the browser's own words: "${dropped.errorText}"`);
  check(dropped.errorText.includes(SUPPORT_EMAIL),
    `a dropped connection showed "${dropped.errorText}", which does not offer ${SUPPORT_EMAIL} as a way through`);
  check(!dropped.successShown, 'a failed request showed the confirmation panel anyway');
  check(!dropped.disabled, 'the submit button stayed disabled after a failed request');
  check(dropped.state === 'failed', `after a dropped request #signup reads data-state="${dropped.state}", expected "failed"`);
  check(dropped.label === dropped.initialLabel,
    `after a failed request the button reads "${dropped.label}", expected "${dropped.initialLabel}"`);
}

const inFlight = await run('pending');
if (inFlight) {
  console.log(`In flight: button ${inFlight.disabled ? 'disabled' : 'STILL LIVE'}, label "${inFlight.label}"`);
  check(inFlight.disabled, 'the submit button stays clickable while a submission is in flight - double submits');
  check(inFlight.label !== inFlight.initialLabel, 'the button gives no sign that a submission is under way');
  check(!inFlight.successShown, 'the confirmation appeared before the server had answered');
  check(inFlight.state === 'submitting', `while in flight #signup reads data-state="${inFlight.state}", expected "submitting"`);
}

const retry = await run('retry');
if (retry) {
  console.log(`Retry: ${retry.calls.length} request(s), states ${retry.states.join(' -> ')}`);
  check(retry.calls.length === 2, `a retry sent ${retry.calls.length} requests, expected 2`);
  check(retry.states.join(',') === 'failed,submitted',
    `a retry went through ${retry.states.join(' -> ')}, expected failed -> submitted`);
  check(!retry.formShown && retry.successShown && !retry.errorShown,
    'after a successful retry the page still shows the form or the error');
}

const empty = await run('ok', { fill: false });
if (empty) {
  console.log(`Empty form: ${empty.calls.length} request(s) sent`);
  check(empty.calls.length === 0,
    'an empty form was submitted anyway - required validation is not stopping it');
  check(!empty.successShown, 'an empty form produced a confirmation');
  check(empty.state === 'idle', `an empty form moved #signup to data-state="${empty.state}", expected "idle"`);
}

await browser.close();
site.close();

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log('\nAll form checks passed');
