import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parse } from 'acorn';

export const COMMENT_DEBT = {
  'fonts/fonts.css': 1,
};

const KIND = [
  [/^llms\.txt$/, null],
  [/\.(m?js)$/, 'js'],
  [/\.css$/, 'css'],
  [/\.(html|xml)$/, 'html'],
  [/\.ya?ml$/, 'yaml'],
  [/\.toml$/, 'toml'],
  [/(\.feature|\.txt|^_headers|^_redirects|\.gitignore)$/, 'hash'],
];

export function kindOf(path) {
  const name = path.split('/').pop();
  for (const [re, kind] of KIND) if (re.test(name)) return kind;
  return null;
}

const lineAt = (src, i) => {
  let n = 1;
  for (let j = 0; j < i; j++) if (src.charCodeAt(j) === 10) n++;
  return n;
};

function jsRanges(src, from = 0, to = src.length) {
  const code = src.slice(from, to);
  const comments = [];
  const parseAs = (sourceType) => parse(code, { ecmaVersion: 'latest', sourceType, allowHashBang: true, onComment: comments });
  try {
    parseAs('module');
  } catch {
    comments.length = 0;
    try {
      parseAs('script');
    } catch (err) {
      throw new Error(`cannot parse as JavaScript (${err.message}), so its comments cannot be counted`);
    }
  }
  return comments
    .filter((c) => !(c.start === 0 && code.startsWith('#!')))
    .map((c) => [from + c.start, from + c.end]);
}

function cssRanges(src, from = 0, to = src.length) {
  const out = [];
  let i = from;
  while (i < to) {
    const c = src[i];
    if (c === '"' || c === "'") {
      i++;
      while (i < to && src[i] !== c && src[i] !== '\n') { if (src[i] === '\\') i++; i++; }
      i++;
      continue;
    }
    if (c === '/' && src[i + 1] === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e === -1 ? to : e + 2;
      out.push([i, end]);
      i = end;
      continue;
    }
    i++;
  }
  return out;
}

function htmlRanges(src) {
  const out = [];
  const re = /<!--[\s\S]*?-->|<(script|style|textarea|title)\b((?:"[^"]*"|'[^']*'|[^>"'])*)>([\s\S]*?)<\/\1\s*>|<\/?[a-z][^\s/>]*(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
  for (const m of src.matchAll(re)) {
    if (m[0].startsWith('<!--')) { out.push([m.index, m.index + m[0].length]); continue; }
    if (!m[1] || /^(textarea|title)$/i.test(m[1])) continue;
    const start = m.index + m[1].length + m[2].length + 2;
    const end = start + m[3].length;
    if (m[1].toLowerCase() === 'style') out.push(...cssRanges(src, start, end));
    else if (!/type\s*=\s*["']?application\/(ld\+)?json/i.test(m[2])) out.push(...jsRanges(src, start, end));
  }
  return out;
}

function hashRanges(src) {
  const out = [];
  let i = 0;
  for (const line of src.split('\n')) {
    const at = line.search(/\S/);
    if (at !== -1 && line[at] === '#') out.push([i + at, i + line.length]);
    i += line.length + 1;
  }
  return out;
}

function tomlRanges(src) {
  const out = [];
  let i = 0;
  let quote = null;
  while (i < src.length) {
    if (quote) {
      if (quote.length === 1 && src[i] === '\n') quote = null;
      else if (quote !== "'" && quote !== "'''" && src[i] === '\\') i++;
      else if (src.startsWith(quote, i)) { i += quote.length; quote = null; continue; }
      i++;
      continue;
    }
    const c = src[i];
    if (c === '"' || c === "'") {
      quote = src.startsWith(c.repeat(3), i) ? c.repeat(3) : c;
      i += quote.length;
      continue;
    }
    if (c === '#') {
      let e = src.indexOf('\n', i);
      if (e === -1) e = src.length;
      out.push([i, e]);
      i = e;
      continue;
    }
    i++;
  }
  return out;
}

const indentOf = (line) => line.search(/\S|$/);

function lineHashes(line, offset, out, state) {
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    if (state.quote) {
      if (state.quote === '"' && c === '\\') j++;
      else if (state.quote === "'" && c === "'" && line[j + 1] === "'") j++;
      else if (c === state.quote) state.quote = null;
      continue;
    }
    if (state.shell && c === '\\') { j++; continue; }
    if (state.shell && line.startsWith('<<<', j)) { j += 2; continue; }
    if (state.shell && c === '<' && line[j + 1] === '<') {
      const h = line.slice(j).match(/^<<-?\s*(['"]?)([\w.-]+)\1/);
      if (h) { state.heredocs.push(h[2]); j += h[0].length - 1; continue; }
    }
    const before = line.slice(0, j);
    if ((c === '"' || c === "'") && state.opensAt(before)) { state.quote = c; continue; }
    if (c === '#' && (j === 0 || /\s/.test(line[j - 1]))) { out.push([offset + j, offset + line.length]); return; }
  }
}

const YAML_VALUE_START = (before) => /(^\s*|^\s*-\s+|:\s+|[[{,]\s*)$/.test(before);
const SHELL_QUOTE = () => true;
const BLOCK_SCALAR = /^(\s*)(?:-\s+)?(?:([^#'"\s][^#'"]*?):\s+)?[|>][-+0-9]*\s*(#.*)?$/;

function yamlRanges(src) {
  const out = [];
  let i = 0;
  let block = null;
  const state = { quote: null, opensAt: YAML_VALUE_START };
  for (const line of src.split('\n')) {
    if (block && (line.trim() === '' || indentOf(line) > block.indent)) {
      const sh = block.shell;
      if (sh && sh.inHeredoc) { if (line.trim() === sh.inHeredoc) sh.inHeredoc = null; }
      else if (sh) {
        lineHashes(line, i, out, sh);
        if (!sh.quote && sh.heredocs.length) sh.inHeredoc = sh.heredocs.shift();
      }
      i += line.length + 1;
      continue;
    }
    block = null;
    lineHashes(line, i, out, state);
    const m = !state.quote && line.match(BLOCK_SCALAR);
    if (m) block = { indent: indentOf(line), shell: m[2] === 'run' && { quote: null, opensAt: SHELL_QUOTE, shell: true, heredocs: [], inHeredoc: null } };
    i += line.length + 1;
  }
  return out;
}

const RANGES = { js: jsRanges, css: cssRanges, html: htmlRanges, hash: hashRanges, yaml: yamlRanges, toml: tomlRanges };

export function findComments(src, kind) {
  return RANGES[kind](src).map(([s, e]) => ({
    line: lineAt(src, s),
    endLine: lineAt(src, Math.max(s, e - 1)),
    start: s,
    end: e,
    text: src.slice(s, e),
  }));
}

const SKIP_DIRS = new Set(['.git', 'node_modules']);

export function sourceFiles(root, dir = root) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(name)) files.push(...sourceFiles(root, path));
      continue;
    }
    const rel = relative(root, path);
    if (kindOf(rel)) files.push(rel);
  }
  return files.sort();
}

export function commentScan(root) {
  const counts = {};
  const unreadable = [];
  for (const f of sourceFiles(root)) {
    try {
      const n = findComments(readFileSync(join(root, f), 'utf8'), kindOf(f)).length;
      if (n) counts[f] = n;
    } catch (err) {
      unreadable.push(`${f}: ${err.message}`);
    }
  }
  return { counts, unreadable };
}

export function commentDrift(counts, debt = COMMENT_DEBT) {
  const faults = [];
  for (const f of new Set([...Object.keys(counts), ...Object.keys(debt)])) {
    const has = counts[f] ?? 0;
    const allowed = debt[f] ?? 0;
    if (has > allowed) {
      faults.push(`${f} has ${has} comment(s), up from the recorded ${allowed}. Comments are banned (docs/adr/0001-no-code-comments.md): put the reason in an ADR and delete the comment. Do not raise COMMENT_DEBT to get green.`);
    } else if (has < allowed) {
      faults.push(`${f} has ${has} comment(s), down from ${allowed}. Lower COMMENT_DEBT['${f}'] in tools/lib/comments.mjs to ${has}${has ? '' : ' (remove the entry)'} so the ratchet holds the gain.`);
    }
  }
  return faults;
}
