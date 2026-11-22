import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { join, extname, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

export const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.txt': 'text/plain',
  '.json': 'application/json',
  '.mp4': 'video/mp4', '.vtt': 'text/vtt',
};

export async function serveSite({ headersFor = () => ({}) } = {}) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    let file = join(ROOT, path === '/' ? 'index.html' : path);
    if (!extname(file) && !existsSync(file) && existsSync(file + '.html')) file += '.html';
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const headers = { ...headersFor(path) };
    if (!file.startsWith(ROOT) || !existsSync(file)) {
      res.writeHead(404, headers);
      return res.end('not found');
    }
    headers['Content-Type'] = TYPES[extname(file)] || 'application/octet-stream';
    res.writeHead(200, headers);
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => server.close(),
  };
}

export function findChrome() {
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

export async function launchBrowser({ extraArgs = [] } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'ss-check-'));
  const chrome = spawn(findChrome(), [
    '--headless', '--disable-gpu', '--no-sandbox',
    '--remote-debugging-port=0', `--user-data-dir=${profile}`, ...extraArgs, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    const t = setTimeout(() => rej(new Error('Timed out waiting for Chromium')), 30000);
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
  const listeners = new Set();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const p = pending.get(m.id); pending.delete(m.id);
      m.error ? p.reject(new Error(m.error.message)) : p.resolve(m.result);
      return;
    }
    for (const fn of listeners) fn(m);
  });

  const call = (method, params = {}, sid) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { resolve: res, reject: rej });
    ws.send(JSON.stringify(sid ? { id, method, params, sessionId: sid } : { id, method, params }));
  });

  const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });

  const send = (method, params = {}) => call(method, params, sessionId);

  return {
    send,
    sessionId,
    on: (fn) => listeners.add(fn),

    async navigate(url) {
      const nav = await send('Page.navigate', { url });
      return nav.errorText || null;
    },

    async evaluate(expression, { awaitPromise = false } = {}) {
      const { result, exceptionDetails } = await send('Runtime.evaluate', {
        expression, returnByValue: true, awaitPromise,
      });
      if (exceptionDetails) throw new Error(exceptionDetails.text + ' ' + (exceptionDetails.exception?.description || ''));
      return JSON.parse(result.value);
    },

    async close() {
      ws.close();
      chrome.kill();
      await new Promise((r) => { chrome.once('exit', r); setTimeout(r, 4000); });
      try { rmSync(profile, { recursive: true, force: true }); } catch {}
    },
  };
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
