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
    freeSeats: el.querySelector('[data-calc="free-seats"]').value,
    discount: el.querySelector('[data-calc="discount"]').value,
    full: out('full'), givenUp: out('given-up'),
    facilitiesFlag: el.querySelector('[data-calc="facilities-flag"]').hasAttribute('data-on'),
    students: el.querySelector('[data-calc="students"]').value,
    facilities: el.querySelector('[data-calc="facilities"]').value,
    staffing: el.querySelector('[data-calc="staffing"]').value,
    tuitionInvalid: el.querySelector('[data-calc="tuition"]').getAttribute('aria-invalid'),
    tuitionError: err('tuition'), studentsError: err('students'), freeSeatsError: err('free-seats'),
    barWidth: bar.width, segs,
    cta: (document.querySelector('#budget-calculator .calc-cta a') || {}).getAttribute?.('href') || null,
    overflow: document.documentElement.scrollWidth > innerWidth + 1
      ? document.documentElement.scrollWidth + ' > ' + innerWidth : null,
    focused: document.activeElement && document.activeElement.getAttribute('data-calc'),
  };
})())`;

const read = () => browser.evaluate(READ);

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

  /* 1. Mounted, with the defaults: 50 students, 2 free, a 10% discount. */
  let r = await read();
  if (!check(r.ready, at('the calculator never mounted - is js/budget-calculator.js blocked or missing?'))) continue;
  check(r.revenue === '$432,000', at(`default collected tuition reads ${r.revenue}, expected $432,000`));
  check(r.full === '$500,000' && r.givenUp === '$68,000', at(`default full / given up read ${r.full} / ${r.givenUp}`));
  check(r.facAnnual === '$64,800' && r.facMonthly === '$5,400', at(`default facilities read ${r.facAnnual} / ${r.facMonthly}`));
  check(r.staffAnnual === '$259,200' && r.staffMonthly === '$21,600', at(`default staffing read ${r.staffAnnual} / ${r.staffMonthly}`));
  check(r.remPct === '25%' && r.remAnnual === '$108,000', at(`default program reads ${r.remPct} / ${r.remAnnual}`));
  check(!r.facilitiesFlag, at('the facilities ceiling flag is on at 15%'));
  check(r.status === 'ok' && r.alert === '', at(`default state is ${r.status} with alert "${r.alert}"`));
  check(r.cta === '/go/budget', at(`the calculator CTA points at ${r.cta}, expected /go/budget`));
  checkBar(r, at('defaults'));

  /* 2. Typing updates instantly, decimals included. Full pay first, then
        free seats and a discount by keyboard. */
  await type('tuition', '12,500.50');
  await type('students', '80');
  await type('free-seats', '0');
  await key('discount', 'Home');
  r = await read();
  check(r.revenue === '$1,000,040', at(`$12,500.50 x 80 full pay reads ${r.revenue}, expected $1,000,040`));
  await type('free-seats', '10');
  await key('discount', 'ArrowRight', 20);
  r = await read();
  check(r.discount === '20' && r.revenue === '$700,028',
    at(`70 paying at 20% off reads ${r.revenue} (discount ${r.discount}), expected $700,028`));
  await type('free-seats', '81');
  r = await read();
  check(r.freeSeatsError && r.revenue === '$700,028', at(`81 free seats of 80 gave error "${r.freeSeatsError}" and revenue ${r.revenue}`));
  await type('free-seats', '10');

  /* 3. Keyboard: the sliders answer arrows, Home and End. */
  await key('facilities', 'ArrowRight', 3);
  r = await read();
  check(r.facilities === '18' && r.facPct === '18%', at(`three ArrowRights left facilities at ${r.facilities} (${r.facPct})`));
  check(r.facilitiesFlag, at('facilities at 18% did not show the 15% ceiling flag'));
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
  check(/exceed the tuition you expect to collect/.test(r.alert), at(`over state announces "${r.alert}"`));
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
  await type('free-seats', '0');
  await key('discount', 'Home');
  r = await read();
  check(r.revenue === '$10,000,000,000', at(`the largest accepted inputs read ${r.revenue}`));
  check(!r.overflow, at(`horizontal overflow with the largest figures: ${r.overflow}`));

  /* 7. Reset restores every default. */
  await browser.evaluate(`(() => { document.querySelector('[data-calc="reset"]').click(); return 'null'; })()`);
  r = await read();
  check(r.tuition === '10,000' && r.students === '50' && r.freeSeats === '2' && r.discount === '10'
    && r.facilities === '15' && r.staffing === '60',
    at(`Reset left ${r.tuition} / ${r.students} / ${r.freeSeats} free / ${r.discount}% / ${r.facilities}% / ${r.staffing}%`));
  check(r.revenue === '$432,000' && r.status === 'ok' && !r.tuitionError && !r.studentsError && !r.freeSeatsError,
    at(`after Reset: ${r.revenue}, ${r.status}, errors "${r.tuitionError}" "${r.studentsError}"`));
  check(r.remainingRowShown && !r.deficitShown, at('after Reset the legend still shows the over-revenue row'));

  console.log(`${String(width).padStart(4)}px  mounted, typed, free seats and discount, keyed, ceiling flag, over 100%, bad input, largest figures, reset`);
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
