import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BeforeAll, AfterAll, setWorldConstructor, setDefaultTimeout, World } from '@cucumber/cucumber';
import { ROOT, serveSite, launchBrowser, sleep } from '../../tools/lib/harness.mjs';

setDefaultTimeout(60_000);

export const ctx = {
  site: null,
  browser: null,
  html: null,
  css: null,
  siteCss: null,
};

export const read = (f) => readFileSync(join(ROOT, f), 'utf8');

BeforeAll(async () => {
  ctx.html = read('index.html');
  ctx.css = read('fonts/fonts.css');
  ctx.siteCss = read('css/site.css');
  ctx.site = await serveSite();
  ctx.browser = await launchBrowser({ extraArgs: ['--hide-scrollbars'] });
  await ctx.browser.send('Page.enable');
});

AfterAll(async () => {
  if (ctx.browser) await ctx.browser.close();
  if (ctx.site) ctx.site.close();
});

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
  sample = null;
  calcInput = {};
  result = null;
}

setWorldConstructor(SchoolStackWorld);
