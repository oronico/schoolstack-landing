/**
 * Structural steps. The file-level assertions delegate to
 * tools/lib/page-audit.mjs; the "which face got painted" assertion asks the
 * browser, because only a browser can answer it.
 */

import assert from 'node:assert/strict';
import { Given, Then } from '@cucumber/cucumber';
import { ctx, loadPage } from '../support/world.mjs';
import {
  danglingAnchors, unsafeBlankLinks, declaredFontFamilies, servedFontFamilies,
} from '../../tools/lib/page-audit.mjs';

Given('the page is loaded at {int} pixels wide', async function (width) {
  await loadPage(width);
});

Then('no anchor points at an id that does not exist', function () {
  const out = danglingAnchors(ctx.html);
  assert.deepEqual(out, [],
    out.map((d) => `href="#${d.target}" on line(s) ${d.lines.join(', ')} scrolls nowhere`).join('\n'));
});

Then('no link opens a new tab without rel="noopener"', function () {
  const out = unsafeBlankLinks(ctx.html);
  assert.deepEqual(out, [], out.map((u) => `line ${u.line}: ${u.tag}`).join('\n'));
});

Then('every declared font family has a matching @font-face', function () {
  const wanted = declaredFontFamilies(ctx.html);
  const served = servedFontFamilies(ctx.css);
  assert.ok(Object.keys(wanted).length, 'the page declares no font families at all');
  for (const [role, family] of Object.entries(wanted)) {
    assert.ok(served.has(family),
      `--font-${role} asks for '${family}' but fonts/fonts.css serves no such @font-face; `
      + `it serves ${[...served].join(', ')}`);
  }
});

Then('the {word} face is Quicksand or Nunito, loaded, and distinct from the fallback',
  async function (role) {
    const f = await ctx.browser.evaluate(`JSON.stringify((() => {
      const ctx2 = document.createElement('canvas').getContext('2d');
      const SAMPLE = 'Handgloves 0123456789';
      const widthIn = (stack) => { ctx2.font = '700 40px ' + stack; return ctx2.measureText(SAMPLE).width; };
      const sel = ${JSON.stringify(role)} === 'display' ? 'h1' : 'p';
      const want = getComputedStyle(document.documentElement)
        .getPropertyValue('--font-' + ${JSON.stringify(role)}).trim().split(',')[0].replace(/['"]/g, '');
      const faces = [...document.fonts].filter((x) => x.family === want);
      const el = document.querySelector(sel);
      return {
        want,
        inFaceSet: faces.length > 0,
        faceStatus: faces.map((x) => x.status).join(',') || 'none',
        distinctFromFallback: !!want && widthIn('"' + want + '", monospace') !== widthIn('monospace'),
        computed: el ? getComputedStyle(el).fontFamily.split(',')[0].replace(/['"]/g, '') : null,
      };
    })())`);

    assert.ok(['Quicksand', 'Nunito'].includes(f.want),
      `--font-${role} asks for '${f.want}', expected a SchoolStack brand face`);
    assert.ok(f.inFaceSet,
      `no @font-face with family '${f.want}' is loaded (faces: ${f.faceStatus}) - the page is painting in a fallback`);
    assert.ok(f.distinctFromFallback,
      `'${f.want}' measures identically to the generic fallback - it is not being applied`);
    assert.equal(f.computed, f.want,
      `--font-${role} is '${f.want}' but the element computes to '${f.computed}'`);
  });
