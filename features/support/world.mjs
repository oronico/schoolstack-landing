/**
 * Shared lifecycle for the feature suite.
 *
 * The site is served once and Chromium launched once for the whole run rather
 * than per scenario: a launch costs about a second and a page load three more,
 * and a suite nobody waits for is a suite nobody runs.
 *
 * The steps call the same modules under tools/lib/ that verify-content.mjs,
 * verify-render.mjs and verify-form.mjs call. Nothing is asserted twice from
 * two implementations - the feature files are a readable front door onto the
 * checks, not a second copy of them.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BeforeAll, AfterAll, setWorldConstructor, setDefaultTimeout, World } from '@cucumber/cucumber';
import { ROOT, serveSite, launchBrowser, sleep } from '../../tools/lib/harness.mjs';

// Launching a browser and loading a page comfortably exceeds Cucumber's 5s.
setDefaultTimeout(60_000);

export const ctx = {
  site: null,
  browser: null,
  html: null,
  css: null,
};

export const read = (f) => readFileSync(join(ROOT, f), 'utf8');

BeforeAll(async () => {
  ctx.html = read('index.html');
  ctx.css = read('fonts/fonts.css');
  ctx.site = await serveSite();
  ctx.browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
  await ctx.browser.send('Page.enable');
});

AfterAll(async () => {
  if (ctx.browser) await ctx.browser.close();
  if (ctx.site) ctx.site.close();
});

/** Load the page and wait for fonts and lazy images to settle. */
export async function loadPage(width = 1440) {
  await ctx.browser.send('Emulation.setDeviceMetricsOverride', {
    width, height: 900, deviceScaleFactor: 1, mobile: width < 500,
  });
  const err = await ctx.browser.navigate(ctx.site.base + '/');
  if (err) throw new Error(`the page failed to load: ${err}`);
  await sleep(1500);
  await ctx.browser.evaluate('(async () => { await document.fonts.ready; return "null"; })()',
    { awaitPromise: true });
}

class SchoolStackWorld extends World {
  /* Scenario-scoped scratch space: the sample copy a Scenario Outline supplies,
     and the result of the last form submission. */
  sample = null;
  result = null;
}

setWorldConstructor(SchoolStackWorld);
