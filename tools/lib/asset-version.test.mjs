/**
 * The ?v= versions on the icons and the link-preview card are content
 * hashes. These tests show the check fails a stale one and the stamp fixes it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './harness.mjs';
import { PAGES, contentVersion, versionDrift, stampVersions } from './asset-version.mjs';

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
