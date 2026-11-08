/**
 * Tests for the structural checks. Both directions, same reasoning as
 * copy-rules.test.mjs: a check only exercised against a page that already
 * passes proves nothing.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import {
  anchorTargets, elementIds, danglingAnchors,
  unsafeBlankLinks, declaredFontFamilies, servedFontFamilies, chromeDrift,
} from './page-audit.mjs';

const page = () => readFileSync(join(ROOT, 'index.html'), 'utf8');
const about = () => readFileSync(join(ROOT, 'about.html'), 'utf8');
const css = () => readFileSync(join(ROOT, 'css/site.css'), 'utf8');

test('anchorTargets collects every in-page target with its lines', () => {
  const out = anchorTargets('<a href="#faq">a</a>\n<a href="#faq">b</a>\n<a href="#top">c</a>');
  assert.deepEqual([...out.keys()].sort(), ['faq', 'top']);
  assert.deepEqual(out.get('faq'), [1, 2]);
});

test('anchorTargets ignores a bare # placeholder', () => {
  // verify-render already fails those separately, as links that go nowhere.
  assert.equal(anchorTargets('<a href="#">x</a>').size, 0);
});

test('elementIds reads ids and needs the leading space, so it never matches an attribute suffix', () => {
  const out = elementIds('<div id="a"></div><div data-id="b"></div>');
  assert.ok(out.has('a'));
  assert.ok(!out.has('b'));
});

test('an anchor with no matching id is dangling, and names the linking line', () => {
  const out = danglingAnchors('<a href="#nope">x</a>\n<div id="yes"></div>');
  assert.deepEqual(out, [{ target: 'nope', lines: [1] }]);
});

test('an anchor with a matching id is not dangling', () => {
  assert.deepEqual(danglingAnchors('<a href="#yes">x</a><div id="yes"></div>'), []);
});

test('target=_blank without rel=noopener is reported', () => {
  const out = unsafeBlankLinks('<a href="https://x.test" target="_blank">x</a>');
  assert.equal(out.length, 1);
  assert.equal(out[0].line, 1);
});

test('target=_blank with rel=noopener passes, in either attribute order', () => {
  assert.deepEqual(unsafeBlankLinks('<a target="_blank" rel="noopener noreferrer" href="/x">x</a>'), []);
  assert.deepEqual(unsafeBlankLinks('<a rel="noopener" href="/x" target="_blank">x</a>'), []);
});

test('declaredFontFamilies reads the custom properties, not any rule using them', () => {
  const out = declaredFontFamilies("--font-display: 'Quicksand', sans-serif; --font-body: 'Nunito', sans-serif;");
  assert.deepEqual(out, { display: 'Quicksand', body: 'Nunito' });
});

test('servedFontFamilies reads the @font-face families', () => {
  const out = servedFontFamilies("@font-face{font-family: 'Quicksand';}@font-face{font-family: 'Nunito';}");
  assert.deepEqual([...out].sort(), ['Nunito', 'Quicksand']);
});

/* ---------------------------------------------------------------------------
   The real files
   --------------------------------------------------------------------------- */

test('index.html has no dangling anchors', () => {
  assert.deepEqual(danglingAnchors(page()), []);
});

test('"/#id" links from another page must land on an id the home page has', () => {
  const home = '<section id="faq"></section>';
  assert.deepEqual(danglingAnchors('<a href="/#faq">FAQ</a>', home), []);
  assert.deepEqual(danglingAnchors('<a href="/#nope">x</a>', home), [{ target: '/#nope', lines: [1] }]);
});

test('about.html has no dangling anchors, its own or into the home page', () => {
  assert.deepEqual(danglingAnchors(about(), page()), []);
});

test('chromeDrift ignores the intended differences and catches the rest', () => {
  const home = '<nav><a href="#faq">FAQ</a><a href="/about">About Us</a></nav><footer>f</footer>';
  const other = '<nav><a href="/#faq">FAQ</a><a href="/about" aria-current="page">About Us</a></nav><footer>f</footer>';
  assert.deepEqual(chromeDrift(home, other), []);
  const drifted = other.replace('FAQ</a>', 'Questions</a>');
  assert.equal(chromeDrift(home, drifted).length, 1);
});

test('the home page and the About page share one nav and one footer', () => {
  assert.deepEqual(chromeDrift(page(), about()), []);
});

test('index.html opens no new tab without rel=noopener', () => {
  assert.deepEqual(unsafeBlankLinks(page()), []);
});

test('every family the page asks for is a family fonts.css serves', () => {
  // The drift this guards: the files still load, so nothing 4xxs, and the whole
  // site paints in Trebuchet MS with every other check green.
  const wanted = declaredFontFamilies(css());
  const served = servedFontFamilies(readFileSync(join(ROOT, 'fonts/fonts.css'), 'utf8'));
  assert.deepEqual(Object.keys(wanted).sort(), ['body', 'display']);
  for (const family of Object.values(wanted)) assert.ok(served.has(family), family);
});
