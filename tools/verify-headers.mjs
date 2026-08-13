#!/usr/bin/env node
/**
 * Serves the site locally with the real _headers rules applied and loads it in
 * headless Chromium, failing on any CSP violation, console error, or missing
 * asset.
 *
 *   node tools/verify-headers.mjs
 *
 * A Content-Security-Policy is the one header that can silently break a page in
 * production: Netlify applies it at the edge, so nothing in local development
 * or in `git diff` will tell you the policy blocked your own stylesheet. Run
 * this whenever _headers or any inline script or style changes.
 */

import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------------------------------------------------------------------------
   Parse _headers - Netlify's format: a path pattern, then indented `Key: value`
   lines until the next unindented line.
   --------------------------------------------------------------------------- */
function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      const idx = line.indexOf(':');
      if (idx > 0) current.headers.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

function matches(pattern, path) {
  const rx = new RegExp('^' + pattern.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
  return rx.test(path);
}

const rules = existsSync(join(ROOT, '_headers')) ? parseHeaders(readFileSync(join(ROOT, '_headers'), 'utf8')) : [];
if (!rules.length) {
  console.error('No _headers rules found - nothing to verify.');
  process.exit(1);
}

const TYPES = {
  '.html': 'text/html', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.json': 'application/json', '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  const path = decodeURIComponent(req.url.split('?')[0]);
  const file = join(ROOT, path === '/' ? 'index.html' : path);
  const headers = {};
  for (const rule of rules) {
    if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) headers[k] = v;
  }
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404, headers);
    return res.end('not found');
  }
  headers['Content-Type'] = TYPES[extname(file)] || 'application/octet-stream';
  res.writeHead(200, headers);
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

/* ---------------------------------------------------------------------------
   Chromium
   --------------------------------------------------------------------------- */
function findChrome() {
  const candidates = [process.env.CHROME_BIN].filter(Boolean);
  const pwRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (existsSync(pwRoot)) {
    for (const entry of readdirSync(pwRoot)) {
      if (entry.startsWith('chromium-')) candidates.push(join(pwRoot, entry, 'chrome-linux', 'chrome'));
    }
  }
  candidates.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  const found = candidates.find((p) => p && existsSync(p));
  if (!found) throw new Error('Could not find Chromium. Set CHROME_BIN and re-run.');
  return found;
}

const profile = mkdtempSync(join(tmpdir(), 'ss-headers-'));
const chrome = spawn(findChrome(), [
  '--headless', '--disable-gpu', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: ['ignore', 'pipe', 'pipe'] });

const wsUrl = await new Promise((res, rej) => {
  let buf = '';
  const t = setTimeout(() => rej(new Error('Timed out waiting for DevTools')), 30000);
  chrome.stderr.on('data', (c) => {
    buf += c;
    const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
    if (m) { clearTimeout(t); res(m[1]); }
  });
  chrome.on('exit', (code) => { clearTimeout(t); rej(new Error(`Chromium exited ${code}`)); });
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));

let seq = 0;
const pending = new Map();
const violations = [];
const consoleErrors = [];
const failedRequests = [];

ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) {
    const p = pending.get(m.id); pending.delete(m.id);
    m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
    return;
  }
  switch (m.method) {
    case 'Log.entryAdded': {
      const e = m.params.entry;
      // CSP refusals surface here with source "security", not as page errors.
      if (e.level === 'error' || e.source === 'security') {
        (/Content Security Policy|Refused to/i.test(e.text) ? violations : consoleErrors).push(e.text);
      }
      break;
    }
    case 'Runtime.consoleAPICalled':
      if (m.params.type === 'error') consoleErrors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
      break;
    case 'Runtime.exceptionThrown':
      consoleErrors.push(m.params.exceptionDetails.text);
      break;
    case 'Network.responseReceived':
      if (m.params.response.status >= 400) failedRequests.push(`${m.params.response.status} ${m.params.response.url.replace(base, '')}`);
      break;
  }
});

const send = (method, params = {}, sid) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, { resolve, reject });
  ws.send(JSON.stringify(sid ? { id, method, params, sessionId: sid } : { id, method, params }));
});

const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
await send('Log.enable', {}, sessionId);
await send('Runtime.enable', {}, sessionId);
await send('Network.enable', {}, sessionId);
await send('Page.enable', {}, sessionId);
await send('Page.navigate', { url: base + '/' }, sessionId);
await new Promise((r) => setTimeout(r, 5000));

// Confirm the headers actually reached the browser rather than trusting the parser.
const probe = await fetch(base + '/');
const seen = Object.fromEntries(
  ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'strict-transport-security']
    .map((h) => [h, probe.headers.get(h)]),
);

ws.close(); chrome.kill(); server.close();
await new Promise((r) => { chrome.once('exit', r); setTimeout(r, 4000); });
try { rmSync(profile, { recursive: true, force: true }); } catch { /* best effort */ }

console.log('Headers served on /:');
for (const [k, v] of Object.entries(seen)) {
  console.log(`  ${v ? 'ok  ' : 'MISS'} ${k}${v ? '' : ' (absent)'}`);
}
const missing = Object.entries(seen).filter(([, v]) => !v).map(([k]) => k);

console.log(`\nCSP violations:  ${violations.length || 'none'}`);
violations.forEach((v) => console.log('  ! ' + v));
console.log(`console errors:  ${consoleErrors.length || 'none'}`);
consoleErrors.forEach((v) => console.log('  ! ' + v));
console.log(`failed requests: ${failedRequests.length || 'none'}`);
failedRequests.forEach((v) => console.log('  ! ' + v));

const bad = violations.length || consoleErrors.length || failedRequests.length || missing.length;
console.log(bad ? '\nFAILED' : '\nAll header checks passed');
process.exit(bad ? 1 : 0);
