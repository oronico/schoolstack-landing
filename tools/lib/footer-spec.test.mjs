import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT } from './harness.mjs';

const read = (f) => readFileSync(resolve(ROOT, f), 'utf8');
const css = read('css/site.css');
const rule = (selector) => {
  const at = css.indexOf(`\n${selector} {`);
  assert.ok(at !== -1, `css/site.css has a rule for ${selector}`);
  return css.slice(at, css.indexOf('}', at));
};
const footerOf = (f) => {
  const page = read(f);
  const from = page.lastIndexOf('<footer');
  return page.slice(from, page.indexOf('</footer>', from));
};
const PAGES = ['index.html', 'about.html', 'privacy.html', 'terms.html', 'giving.html', 'ready.html', '404.html'];

test('the footer columns come in the suite order', () => {
  for (const f of PAGES) {
    const labels = [...footerOf(f).matchAll(/<div class="footer-col[^"]*">\s*<h2>([^<]+)<\/h2>/g)].map((m) => m[1]);
    assert.deepEqual(labels, ['Free tools', 'Resources', 'Incubated by'], f);
  }
});

test('the legal links read Privacy, Terms, Contact us', () => {
  for (const f of PAGES) {
    const footer = footerOf(f);
    const links = footer.slice(footer.indexOf('<ul class="footer-links">'));
    const names = [...links.slice(0, links.indexOf('</ul>')).matchAll(/>([^<]+)<\/a>/g)].map((m) => m[1]);
    assert.deepEqual(names, ['Privacy', 'Terms', 'Contact us'], f);
  }
});

test('the Impact Fund logo is a link to the Impact Fund, over the credit and the email', () => {
  for (const f of PAGES) {
    const column = footerOf(f).split('<h2>Incubated by</h2>')[1];
    assert.match(column, /^\s*<a class="footer-mark" href="https:\/\/www\.buildinghopeimpactfund\.org" target="_blank" rel="noopener noreferrer"><img [^>]*alt="Building Hope Impact Fund"/, f);
    assert.ok(column.indexOf('footer-credit') < column.indexOf('mailto:allison@schoolstack.ai'), f);
  }
});

test('links, the tagline and the credit are 14px; labels and legal lines are 12px', () => {
  assert.match(css, /--step--2: 0\.875rem;/);
  assert.match(css, /--step--3: 0\.75rem;/);
  assert.match(rule('.footer-col li a, .footer-links a, .footer-email'), /font-size: var\(--step--2\)/);
  assert.match(rule('.footer-text'), /font-size: var\(--step--2\)/);
  assert.match(rule('.footer-col h2'), /font-size: var\(--step--3\)/);
  assert.match(rule('.footer-legal'), /font-size: var\(--step--3\)/);
});

test('the two small sizes are used by the footer alone', () => {
  const users = css.split('\n').filter((line) => /var\(--step--[23]\)/.test(line));
  for (const line of users) assert.match(line, /^\s*\.(footer|guide-page \.footer)/, line.trim().slice(0, 60));
});

test('a link is 44px tall on a phone', () => {
  const phone = css.slice(css.indexOf('@media (max-width: 639.98px)'));
  assert.match(phone.slice(0, phone.indexOf('\n}')), /\.footer-col li a, \.footer-links a, \.footer-email \{ min-height: 44px;/);
});
