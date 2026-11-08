#!/usr/bin/env node
/**
 * Drives the durability snapshot in headless Chromium, the way a visitor would:
 *
 *   node tools/verify-calculator.mjs
 *
 * The arithmetic is unit tested in tools/lib/budget-calculator.test.mjs. This
 * checks what only a real page can show:
 *
 *  - the script loads under the site's CSP and mounts (a blocked script leaves
 *    the server-rendered defaults on screen, which look right and never move);
 *  - typing updates the figures with no submit button;
 *  - the sliders answer the keyboard (arrows, Home, End);
 *  - past 100% the deficit shows, the warning appears, and no bar segment
 *    leaves its track;
 *  - bad input is named on the field and does not blank the results;
 *  - Reset puts every default back;
 *  - at phone width nothing overflows, even with the largest accepted figures;
 *  - the CTA goes to the existing Budget route.
 *
 * Exits non-zero on any failure, naming what it saw.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, serveSite, launchBrowser, sleep } from './lib/harness.mjs';
import { parseHeaders, headersFor } from './lib/netlify.mjs';

// Serve with the real _headers so the CSP that ships is the CSP under test.
const rules = parseHeaders(readFileSync(join(ROOT, '_headers'), 'utf8'));
const site = await serveSite({ headersFor: (p) => headersFor(rules, p) });
const browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
await browser.send('Page.enable');
await browser.send('Runtime.enable');

const failures = [];
const fail = (m) => failures.push(m);
const check = (ok, m) => { if (!ok) fail(m); return ok; };

const pageErrors = [];
browser.on((m) => {
  if (m.method === 'Runtime.exceptionThrown') pageErrors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') pageErrors.push(m.params.args.map((a) => a.value).join(' '));
});

/* Read every figure the calculator shows, plus the state it is in. */
const READ = `JSON.stringify((() => {
  const el = document.querySelector('[data-budget-calculator]');
  const out = (n) => el.querySelector('[data-out="' + n + '"]').textContent.trim();
  const bar = el.querySelector('[data-calc="bar"]').getBoundingClientRect();
  const segs = [...el.querySelectorAll('.calc-bar .seg')].map((s) => {
    const r = s.getBoundingClientRect();
    return { cls: s.className, w: r.width, left: r.left - bar.left, right: r.right - bar.left };
  });
  const err = (n) => { const e = el.querySelector('[data-calc="' + n + '-error"]'); return e.hidden ? '' : e.textContent; };
  return {
    ready: el.hasAttribute('data-ready'),
    status: el.getAttribute('data-status'),
    revenue: out('revenue'), revenueMonthly: out('revenue-monthly'),
    facPct: out('facilities-pct'), facAnnual: out('facilities-annual'), facMonthly: out('facilities-monthly'),
    staffPct: out('staffing-pct'), staffAnnual: out('staffing-annual'), staffMonthly: out('staffing-monthly'),
    remPct: out('remaining-pct'), remAnnual: out('remaining-annual'), remMonthly: out('remaining-monthly'),
    alert: el.querySelector('[data-calc="alert"]').textContent,
    deficitShown: !el.querySelector('[data-calc="deficit-legend"]').hidden,
    remainingRowShown: !el.querySelector('[data-calc="remaining-legend"]').hidden,
    tuition: el.querySelector('[data-calc="tuition"]').value,
    barLabel: el.querySelector('[data-calc="bar"]').getAttribute('aria-label'),
    remainingLegendText: el.querySelector('[data-calc="remaining-legend"]').textContent.replace(/\\s+/g, ' ').trim(),
    students: el.querySelector('[data-calc="students"]').value,
    facilities: el.querySelector('[data-calc="facilities"]').value,
    staffing: el.querySelector('[data-calc="staffing"]').value,
    tuitionInvalid: el.querySelector('[data-calc="tuition"]').getAttribute('aria-invalid'),
    tuitionError: err('tuition'), studentsError: err('students'),
    barWidth: bar.width, segs,
    cta: (document.querySelector('#budget-calculator .calc-cta a') || {}).getAttribute?.('href') || null,
    overflow: document.documentElement.scrollWidth > innerWidth + 1
      ? document.documentElement.scrollWidth + ' > ' + innerWidth : null,
    focused: document.activeElement && document.activeElement.getAttribute('data-calc'),
  };
})())`;

const read = () => browser.evaluate(READ);

/* The break-even card: its figures, its fields and their errors. */
const READ_BE = `JSON.stringify((() => {
  const el = document.querySelector('[data-break-even-calculator]');
  const out = (n) => el.querySelector('[data-out="' + n + '"]').textContent.trim();
  const err = (n) => { const e = el.querySelector('[data-be="' + n + '-error"]'); return e.hidden ? '' : e.textContent; };
  return {
    ready: el.hasAttribute('data-ready'),
    result: out('be-result'), formula: out('be-formula'), sentence: out('be-sentence'),
    alert: el.querySelector('[data-be="alert"]').textContent,
    expenses: el.querySelector('[data-be="expenses"]').value,
    expensesError: err('expenses'), perStudentError: err('per-student'),
    perStudentInvalid: el.querySelector('[data-be="per-student"]').getAttribute('aria-invalid'),
    overflow: document.documentElement.scrollWidth > innerWidth + 1
      ? document.documentElement.scrollWidth + ' > ' + innerWidth : null,
  };
})())`;
const readBe = () => browser.evaluate(READ_BE);

async function typeBe(name, text) {
  await browser.evaluate(`(() => { const i = document.querySelector('[data-be="${name}"]'); i.focus(); i.select(); return 'null'; })()`);
  await browser.send('Input.insertText', { text });
  await sleep(50);
}

/* Type into a field as a person would: focus, select all, send the keys. */
async function type(name, text) {
  await browser.evaluate(`(() => { const i = document.querySelector('[data-calc="${name}"]'); i.focus(); i.select(); return 'null'; })()`);
  await browser.send('Input.insertText', { text });
  await sleep(50);
}

async function key(name, keyName, times = 1) {
  const codes = { ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35, Tab: 9 };
  if (name) await browser.evaluate(`(() => { document.querySelector('[data-calc="${name}"]').focus(); return 'null'; })()`);
  for (let i = 0; i < times; i++) {
    const base = { key: keyName, code: keyName, windowsVirtualKeyCode: codes[keyName] };
    await browser.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
    await browser.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
  }
  await sleep(50);
}

function checkBar(r, where) {
  for (const s of r.segs) {
    check(s.w >= 0, `${where}: ${s.cls} has width ${s.w}`);
    check(s.left >= -0.5 && s.right <= r.barWidth + 0.5,
      `${where}: ${s.cls} spans ${s.left.toFixed(1)}..${s.right.toFixed(1)} outside a ${r.barWidth.toFixed(1)}px track`);
  }
}

for (const width of [1440, 820, 390]) {
  await browser.send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
  const navError = await browser.navigate(site.base + '/');
  if (navError) { fail(`${width}px  navigation failed: ${navError}`); continue; }
  await sleep(1500);
  const at = (m) => `${width}px  ${m}`;

  /* 1. Mounted, with the defaults: $10,000 x 50 students. */
  let r = await read();
  if (!check(r.ready, at('the calculator never mounted - is js/budget-calculator.js blocked or missing?'))) continue;
  check(r.revenue === '$500,000', at(`default tuition collected reads ${r.revenue}, expected $500,000`));
  check(r.facAnnual === '$75,000' && r.facMonthly === '$6,250', at(`default facilities read ${r.facAnnual} / ${r.facMonthly}`));
  check(r.staffAnnual === '$300,000' && r.staffMonthly === '$25,000', at(`default staffing read ${r.staffAnnual} / ${r.staffMonthly}`));
  check(r.remPct === '25%' && r.remAnnual === '$125,000', at(`default remainder reads ${r.remPct} / ${r.remAnnual}`));
  // The chart, its legend and its accessible description use one wording.
  check(/other expenses and reserves/i.test(r.remainingLegendText), at(`legend reads "${r.remainingLegendText}"`));
  check(/remaining for other expenses and reserves 25%/.test(r.barLabel), at(`bar is described as "${r.barLabel}"`));
  check(r.status === 'ok' && r.alert === '', at(`default state is ${r.status} with alert "${r.alert}"`));
  check(r.cta === '/go/budget', at(`the calculator CTA points at ${r.cta}, expected /go/budget`));
  checkBar(r, at('defaults'));

  /* 1b. Built for a thumb as well as a mouse: every control at least 44px
         tall, the text boxes at 16px or more (iOS Safari zooms the page on
         focus below that), and no copy smaller than 12px. */
  const touch = await browser.evaluate(`JSON.stringify((() => {
    const sec = document.getElementById('budget-calculator');
    return {
      short: [...sec.querySelectorAll('input, button, a')]
        .filter((e) => e.getBoundingClientRect().height < 44)
        .map((e) => (e.id || e.textContent.trim()).slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().height) + 'px'),
      zooms: [...sec.querySelectorAll('input[type="text"]')]
        .filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id),
      tiny: [...sec.querySelectorAll('p, li, span, label, output')]
        .filter((e) => e.offsetParent && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 12)
        .map((e) => e.textContent.trim().slice(0, 30)),
    };
  })())`);
  for (const t of touch.short) check(false, at(`tap target under 44px: ${t}`));
  for (const z of touch.zooms) check(false, at(`#${z} is under 16px, so iPhones zoom the page when it is tapped`));
  for (const t of touch.tiny) check(false, at(`text under 12px: "${t}"`));

  /* 2. Typing updates instantly, decimals included. */
  await type('tuition', '12,500.50');
  await type('students', '80');
  r = await read();
  check(r.revenue === '$1,000,040', at(`$12,500.50 x 80 reads ${r.revenue}, expected $1,000,040`));

  /* 3. Keyboard: the sliders answer arrows, Home and End. */
  await key('facilities', 'ArrowRight', 3);
  r = await read();
  check(r.facilities === '18' && r.facPct === '18%', at(`three ArrowRights left facilities at ${r.facilities} (${r.facPct})`));
  check(r.focused === 'facilities', at(`focus moved off the facilities slider to ${r.focused}`));
  await key('facilities', 'ArrowLeft');
  r = await read();
  check(r.facilities === '17', at(`ArrowLeft left facilities at ${r.facilities}`));

  /* 4. Tight, then over 100%. */
  await key('facilities', 'End');                      // 40
  await key('staffing', 'Home');                       // 0
  await key('staffing', 'ArrowRight', 50);             // 50 -> 90% allocated, 10% left
  r = await read();
  check(r.status === 'tight', at(`40% + 50% reads as "${r.status}", expected tight`));
  check(/may be tight/.test(r.alert), at(`tight state announces "${r.alert}"`));

  await key('staffing', 'End');                        // 90 -> 130%
  r = await read();
  check(r.facilities === '40' && r.staffing === '90', at(`End left sliders at ${r.facilities} / ${r.staffing}`));
  check(r.status === 'over', at(`130% allocated reads as "${r.status}", expected over`));
  check(r.remPct === '−30%', at(`130% allocated shows remaining ${r.remPct}, expected −30%`));
  check(r.remAnnual.startsWith('−$'), at(`the deficit amount reads ${r.remAnnual}, expected a negative dollar figure`));
  check(r.deficitShown, at('the over-revenue legend row stayed hidden'));
  check(!r.remainingRowShown, at('the legend lists the shortfall twice: "Everything else" is still shown past 100%'));
  check(/exceed the annual tuition and funding entered/.test(r.alert), at(`over state announces "${r.alert}"`));
  check(/over the tuition and funding entered by 30%/.test(r.barLabel), at(`over state bar is described as "${r.barLabel}"`));
  checkBar(r, at('130% allocated'));

  /* 5. Bad input is named on the field and does not blank the figures. */
  const before = r.revenue;
  await type('tuition', 'ten thousand');
  r = await read();
  check(r.tuitionInvalid === 'true' && r.tuitionError, at('non-numeric tuition was not flagged'));
  check(r.revenue === before, at(`non-numeric tuition changed revenue from ${before} to ${r.revenue}`));
  await type('students', '-4');
  r = await read();
  check(r.studentsError, at('negative enrollment was not flagged'));
  await type('tuition', '');
  r = await read();
  check(r.tuitionError, at('empty tuition was not flagged'));

  /* 6. The largest accepted figures still fit at this width. */
  await type('tuition', '1000000');
  await type('students', '10000');
  r = await read();
  check(r.revenue === '$10,000,000,000', at(`the largest accepted inputs read ${r.revenue}`));
  check(!r.overflow, at(`horizontal overflow with the largest figures: ${r.overflow}`));

  /* 7. Reset restores every default. */
  await browser.evaluate(`(() => { document.querySelector('[data-calc="reset"]').click(); return 'null'; })()`);
  r = await read();
  check(r.tuition === '10,000' && r.students === '50' && r.facilities === '15' && r.staffing === '60',
    at(`Reset left ${r.tuition} / ${r.students} / ${r.facilities}% / ${r.staffing}%`));
  check(r.revenue === '$500,000' && r.status === 'ok' && !r.tuitionError && !r.studentsError,
    at(`after Reset: ${r.revenue}, ${r.status}, errors "${r.tuitionError}" "${r.studentsError}"`));
  check(r.remainingRowShown && !r.deficitShown, at('after Reset the legend still shows the over-revenue row'));

  /* 8. Break-even: mounted with its defaults, then typed. */
  let b = await readBe();
  if (check(b.ready, at('the break-even card never mounted - is js/budget-calculator.js blocked or missing?'))) {
    check(b.result === '60 students', at(`default break-even reads "${b.result}", expected "60 students"`));
    check(b.formula === '$600,000 ÷ $10,000 per student', at(`default break-even working reads "${b.formula}"`));
    check(/exactly what a year costs/.test(b.sentence), at(`default break-even sentence reads "${b.sentence}"`));

    await typeBe('expenses', '600,001');
    b = await readBe();
    check(b.result === '61 students', at(`$600,001 at $10,000 reads "${b.result}", expected it rounded UP to "61 students"`));
    check(/rounded up/.test(b.formula), at(`a remainder did not say it rounded up: "${b.formula}"`));
    check(b.sentence === 'At 61 students you collect $610,000, $9,999 above what a year costs.', at(`sentence reads "${b.sentence}"`));
    check(b.alert === '61 students to break even.', at(`screen readers hear "${b.alert}"`));

    // Bad input is named on the field and keeps the last good answer.
    await typeBe('per-student', '0');
    b = await readBe();
    check(b.perStudentInvalid === 'true' && /at least \$1/.test(b.perStudentError), at(`$0 per student was not refused: "${b.perStudentError}"`));
    check(b.result === '61 students', at(`a refused entry changed the answer to "${b.result}"`));
    await typeBe('expenses', 'six hundred');
    b = await readBe();
    check(b.expensesError, at('non-numeric expenses were not flagged'));

    // The largest accepted figures still fit at this width.
    await typeBe('expenses', '50000000');
    await typeBe('per-student', '1');
    b = await readBe();
    check(b.result === '50,000,000 students', at(`the largest break-even reads "${b.result}"`));
    check(!b.overflow, at(`horizontal overflow with the largest break-even: ${b.overflow}`));

    // The field tidies itself once the founder leaves it.
    await browser.evaluate(`(() => { document.querySelector('[data-be="expenses"]').blur(); return 'null'; })()`);
    b = await readBe();
    check(b.expenses === '50,000,000', at(`expenses box reads "${b.expenses}" after blur, expected "50,000,000"`));
  }

  console.log(`${String(width).padStart(4)}px  mounted, tap targets, labels, typed, keyed, over 100%, bad input, largest figures, reset, break-even`);
}

await browser.close();
site.close();

for (const e of pageErrors) fail(`page error: ${e}`);

if (failures.length) {
  console.log(`\n${failures.length} failure(s):`);
  for (const f of failures) console.log('  ! ' + f);
  process.exit(1);
}
console.log('\nAll calculator checks passed');
