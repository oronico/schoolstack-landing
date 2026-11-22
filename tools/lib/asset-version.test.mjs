import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import { PAGES, contentVersion, versionDrift, stampVersions, unversionedImages } from './asset-version.mjs';

test('every committed page carries the current version of each icon and card', () => {
  for (const f of PAGES) assert.deepEqual(versionDrift(readFileSync(join(ROOT, f), 'utf8'), ROOT), [], f);
});

test('a stale version is caught, in each of the three reference forms, and stamping fixes it', () => {
  const text = [
    '<link rel="icon" href="/favicon.svg?v=00000000">',
    '<meta property="og:image" content="https://schoolstack.ai/og-image.png?v=">',
    '{ "src": "/icon-192.png?v=old" }',
  ].join('\n');
  assert.deepEqual(versionDrift(text, ROOT).map((d) => d.file), ['favicon.svg', 'og-image.png', 'icon-192.png']);
  const stamped = stampVersions(text, ROOT);
  assert.deepEqual(versionDrift(stamped, ROOT), []);
  assert.ok(stamped.includes(`/favicon.svg?v=${contentVersion(ROOT, 'favicon.svg')}"`));
});

test('an image in /images is versioned like the icons, and a bare one is caught', () => {
  const stale = '<img src="/images/stt-logo.png?v=00000000">';
  assert.deepEqual(versionDrift(stale, ROOT).map((d) => d.file), ['images/stt-logo.png']);
  assert.deepEqual(versionDrift(stampVersions(stale, ROOT), ROOT), []);
  assert.deepEqual(unversionedImages('<p>\n<img src="/images/stt-logo.png">'), [{ ref: '/images/stt-logo.png', line: 2 }]);
  assert.deepEqual(unversionedImages(stampVersions(stale, ROOT)), []);
});

test('every committed page versions each image it loads from /images', () => {
  for (const f of PAGES) assert.deepEqual(unversionedImages(readFileSync(join(ROOT, f), 'utf8')), [], f);
});
