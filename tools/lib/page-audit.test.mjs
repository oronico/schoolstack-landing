import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import {
  anchorTargets, elementIds, danglingAnchors,
  unsafeBlankLinks, declaredFontFamilies, servedFontFamilies, chromeDrift,
  formFields, privacyFieldDrift, cookieUse, FORMS,
  faqDrift, retiredAnchorLinks, RETIRED_ANCHORS, assetHashDrift, relativeFileRefs,
  pngSize, ogImageSizeFault, pixelFontSizes,
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
  const out = declaredFontFamilies("--font-display: 'Quicksand', sans-serif; --font-body: 'Inter', sans-serif;");
  assert.deepEqual(out, { display: 'Quicksand', body: 'Inter' });
});

test('servedFontFamilies reads the @font-face families', () => {
  const out = servedFontFamilies("@font-face{font-family: 'Quicksand';}@font-face{font-family: 'Inter';}");
  assert.deepEqual([...out].sort(), ['Inter', 'Quicksand']);
});

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

test('formFields reads the application, minus Netlify plumbing and the spam trap', () => {
  const html = '<form id="signupForm"><input type="hidden" name="form-name"><input name="bot-field">'
    + '<input name="email"><select name="schoolState"></select><textarea name="headache"></textarea></form>';
  assert.deepEqual([...formFields(html)].sort(), ['email', 'headache', 'schoolState']);
});

test('privacyFieldDrift catches a new form field the policy does not list, and a stale one', () => {
  const form = '<form id="signupForm"><input name="email"><input name="phone"></form>';
  const policy = '<li data-field="email"></li><li data-field="fax"></li>';
  assert.deepEqual(privacyFieldDrift(form, policy), { unlisted: ['phone'], stale: ['fax'] });
});

test('the privacy policy lists exactly what each form collects, form by form', () => {
  const policy = readFileSync(join(ROOT, 'privacy.html'), 'utf8');
  for (const f of FORMS) {
    assert.deepEqual(privacyFieldDrift(page(), policy, f), { unlisted: [], stale: [] }, f.label);
  }
});

test('a field listed under one form does not cover another form', () => {
  const html = '<form id="a"><input name="email"></form><form id="b"><input name="phone"></form>';
  const policy = '<ul data-form="one"><li data-field="email"></li><li data-field="phone"></li></ul><ul data-form="two"></ul>';
  assert.deepEqual(privacyFieldDrift(html, policy, { id: 'b', name: 'two' }), { unlisted: ['phone'], stale: [] });
});

test('cookieUse spots code that would break the no-cookies promise', () => {
  assert.equal(cookieUse('document.cookie = "a=1"'), true);
  assert.equal(cookieUse('var cookieJar = 1;'), false);
});

test('every page shares the home page nav and footer', () => {
  for (const p of ['about.html', 'privacy.html', 'terms.html', 'giving.html', 'ready.html']) {
    assert.deepEqual(chromeDrift(page(), readFileSync(join(ROOT, p), 'utf8')), [], p);
  }
});

test('index.html opens no new tab without rel=noopener', () => {
  assert.deepEqual(unsafeBlankLinks(page()), []);
});

test('every family the page asks for is a family fonts.css serves', () => {
  const wanted = declaredFontFamilies(css());
  const served = servedFontFamilies(readFileSync(join(ROOT, 'fonts/fonts.css'), 'utf8'));
  assert.deepEqual(Object.keys(wanted).sort(), ['body', 'display']);
  for (const family of Object.values(wanted)) assert.ok(served.has(family), family);
});

const faqItem = (id, q, a) => `<details class="faq-item"${id ? ` id="${id}"` : ''}>\n<summary><h3>${q}</h3></summary>\n<p>${a}</p></details>`;
const entity = (id, q, a) => ({ '@id': id && `https://schoolstack.ai/#${id}`, name: q, acceptedAnswer: { text: a } });

test('faqDrift pairs questions by id, so a reorder is not a failure', () => {
  const html = faqItem('faq-a', 'A?', 'Yes.') + faqItem('faq-b', 'B?', 'No.');
  assert.deepEqual(faqDrift(html, [entity('faq-b', 'B?', 'No.'), entity('faq-a', 'A?', 'Yes.')]), []);
});

test('faqDrift names the question whose answer differs', () => {
  const out = faqDrift(faqItem('faq-a', 'A?', 'Yes.'), [entity('faq-a', 'A?', 'Maybe.')]);
  assert.equal(out.length, 1);
  assert.match(out[0], /#faq-a answer differs/);
});

test('faqDrift fails a question with no id, and one on only one side', () => {
  assert.match(faqDrift(faqItem('', 'A?', 'Yes.'), [])[0], /has no id/);
  assert.match(faqDrift(faqItem('faq-a', 'A?', 'Yes.'), [])[0], /#faq-a is on the page but not in the JSON-LD/);
  assert.match(faqDrift('', [entity('faq-a', 'A?', 'Yes.')])[0], /#faq-a is in the JSON-LD but not on the page/);
});

test('faqDrift passes the live FAQ', () => {
  const html = page();
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => JSON.parse(m[1])).flatMap((d) => d['@graph'] || [d]).find((d) => d['@type'] === 'FAQPage');
  const section = html.match(/<section[^>]*id="faq"[\s\S]*?<\/section>/)[0];
  assert.deepEqual(faqDrift(section, ld.mainEntity), []);
});

test('retiredAnchorLinks catches a link to a retired id, on the page and from another page', () => {
  const out = retiredAnchorLinks('<a href="#apply">a</a>\n<a href="/#design-partners">b</a>');
  assert.deepEqual(out.map((o) => o.id).sort(), ['apply', 'design-partners']);
  assert.ok(out.every((o) => o.use === 'early-access'));
});

test('no page links a retired id, and each retired id still exists on the home page', () => {
  for (const f of ['index.html', 'about.html', 'privacy.html', 'terms.html', 'giving.html', 'ready.html']) {
    assert.deepEqual(retiredAnchorLinks(readFileSync(join(ROOT, f), 'utf8')), [], f);
  }
  const ids = elementIds(page());
  for (const [id, use] of Object.entries(RETIRED_ANCHORS)) {
    assert.ok(ids.has(id), `#${id} must stay, so links already shared keep working`);
    assert.ok(ids.has(use), `#${use} must exist`);
  }
});

test('assetHashDrift fails a missing or wrong hash and passes a right one', () => {
  const bytes = { 'a.svg': 'x' };
  const sha = (b) => (b === 'x' ? 'abcdef12' + '0'.repeat(56) : 'f'.repeat(64));
  assert.deepEqual(assetHashDrift(['assets/a.abcdef12.svg'], () => 'x', sha), []);
  assert.match(assetHashDrift(['assets/a.svg'], () => bytes['a.svg'], sha)[0], /carries no content hash/);
  assert.match(assetHashDrift(['assets/a.12345678.svg'], () => 'x', sha)[0], /named 12345678 but its content hashes to abcdef12/);
});

test('relativeFileRefs catches a page-relative path and leaves root, remote and data paths alone', () => {
  const out = relativeFileRefs('<img src="images/a.png">\n<img src="/images/b.png"><img src="https://x/c.png"><img src="data:x">');
  assert.deepEqual(out, [{ ref: 'images/a.png', line: 1 }]);
});

test('the share card size is read from the PNG header and compared to the metadata', () => {
  const png = readFileSync(join(ROOT, 'og-image.png'));
  const { w, h } = pngSize(png);
  assert.equal(ogImageSizeFault('og-image.png', png, String(w), String(h)), null);
  assert.match(ogImageSizeFault('og-image.png', png, String(w + 1), String(h)), /declares .* but og-image\.png is/);
});

test('a share card that is not a PNG fails by name instead of crashing', () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(40).fill(0)]);
  assert.equal(pngSize(jpeg), null);
  assert.match(ogImageSizeFault('og-image.jpg', jpeg, '1200', '630'), /is not a PNG/);
  assert.match(ogImageSizeFault('og-image.png', Buffer.alloc(3), '1200', '630'), /is not a PNG/);
});

test('pixelFontSizes finds a px font size on screen and leaves print alone', () => {
  const sheet = [
    '.a{font-size:15px}',
    '.b{font-size:0.9375rem}',
    '@media print {',
    '  html { font-size: 15px; }',
    '}',
    '.c { font-size: 12.5px; }',
    '.d{font-size:clamp(34px,6vw,3.5rem)}',
    '.e{font-size:clamp(1rem, 0.9rem + 1vw, 1.25rem); margin: 0 12px}',
  ].join('\n');
  assert.deepEqual(pixelFontSizes(sheet), [{ line: 1, px: 15 }, { line: 6, px: 12.5 }, { line: 7, px: 34 }]);
});

test('no stylesheet sets a screen font size in px, so text follows the browser setting', () => {
  for (const f of ['css/site.css', 'css/enrollment.css']) {
    assert.deepEqual(pixelFontSizes(readFileSync(join(ROOT, f), 'utf8')), [], f);
  }
});
