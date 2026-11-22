import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const COMMENT_DEBT = {
  'fonts/fonts.css': 1,
};

const KIND = [
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

const CONTROL_WORDS = new Set(['if', 'while', 'for', 'with']);

const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'throw', 'new', 'else', 'do', 'yield', 'await', 'instanceof']);

const IDENT = /[\p{ID_Continue}$\u200c\u200d]/u;

const WORD = /^[\p{ID_Continue}$\u200c\u200d]+$/u;

const BLOCK_AFTER_WORD = new Set(['else', 'do', 'try', 'finally']);

const OPERATOR = /^[=(,:?[!&|+\-*%<>~^]$/;

function jsRanges(src, from = 0, to = src.length) {
  const out = [];
  let i = from;
  let prev = '';
  const braces = [];
  const parens = [];
  if (src.startsWith('#!', i)) while (i < to && src[i] !== '\n') i++;

  const endsValue = () => prev === 'str' || prev === 'prop' || prev === ')' || prev === ']' || prev === '}'
    || (WORD.test(prev) && !REGEX_AFTER_WORD.has(prev));

  const opensObject = () => OPERATOR.test(prev) || prev === '++' || prev === '--'
    || (REGEX_AFTER_WORD.has(prev) && !BLOCK_AFTER_WORD.has(prev));

  const regexAllowed = () => {
    if (prev === '' || prev === 'ctl)') return true;
    if (prev === 'prop') return false;
    if (WORD.test(prev)) return REGEX_AFTER_WORD.has(prev);
    return !/^[)\]}'"`]$/.test(prev) && prev !== 'str';
  };

  const skipString = (q) => {
    i++;
    while (i < to && src[i] !== q) {
      if (src[i] === '\\') i++;
      i++;
    }
    i++;
  };

  const skipTemplate = () => {
    i++;
    while (i < to) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '`') { i++; return; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; braces.push('tpl'); return 'expr'; }
      i++;
    }
  };

  const resumeTemplate = () => {
    while (i < to) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '`') { i++; return; }
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; braces.push('tpl'); return 'expr'; }
      i++;
    }
  };

  const skipRegex = () => {
    i++;
    let inClass = false;
    while (i < to && src[i] !== '\n') {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '[') inClass = true;
      else if (c === ']') inClass = false;
      else if (c === '/' && !inClass) break;
      i++;
    }
    i++;
    while (i < to && /[a-z]/i.test(src[i])) i++;
  };

  while (i < to) {
    const c = src[i];
    const d = src[i + 1];
    if (c === '/' && d === '/') {
      const s = i;
      while (i < to && src[i] !== '\n') i++;
      out.push([s, i]);
      continue;
    }
    if (c === '/' && d === '*') {
      const s = i;
      const e = src.indexOf('*/', i + 2);
      i = e === -1 ? to : e + 2;
      out.push([s, i]);
      continue;
    }
    if (/\s/.test(c)) { i++; continue; }
    if (c === '"' || c === "'") { skipString(c); prev = 'str'; continue; }
    if (c === '`') { prev = skipTemplate() === 'expr' ? '' : 'str'; continue; }
    if (c === '/' && regexAllowed()) { skipRegex(); prev = 'str'; continue; }
    if (c === '(') { parens.push(CONTROL_WORDS.has(prev)); prev = c; i++; continue; }
    if (c === ')') { prev = parens.pop() ? 'ctl)' : c; i++; continue; }
    if ((c === '+' || c === '-') && d === c) { i += 2; if (!endsValue()) prev = c + c; continue; }
    if (c === '=' && d === '>') { i += 2; prev = '=>'; continue; }
    if (c === '{') { braces.push(opensObject() ? 'object' : 'block'); prev = c; i++; continue; }
    if (c === '}') {
      const top = braces.pop();
      i++;
      if (top === 'tpl') prev = resumeTemplate() === 'expr' ? '' : 'str';
      else prev = top === 'block' ? '' : c;
      continue;
    }
    if (IDENT.test(c)) {
      const s = i;
      while (i < to && IDENT.test(src[i])) i++;
      prev = prev === '.' ? 'prop' : src.slice(s, i);
      continue;
    }
    prev = c;
    i++;
  }
  return out;
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
    const start = m.index + m[0].indexOf('>') + 1;
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
    const before = line.slice(0, j);
    if ((c === '"' || c === "'") && state.opensAt(before)) { state.quote = c; continue; }
    if (c === '#' && (j === 0 || /\s/.test(line[j - 1]))) { out.push([offset + j, offset + line.length]); return; }
  }
}

const YAML_VALUE_START = (before) => /(^\s*|^\s*-\s+|:\s+|[[{,]\s*)$/.test(before);
const SHELL_WORD_START = (before) => before === '' || /\s$/.test(before);
const BLOCK_SCALAR = /^(\s*)(?:-\s+)?(?:([^#'"\s][^#'"]*?):\s+)?[|>][-+0-9]*\s*(#.*)?$/;

function yamlRanges(src) {
  const out = [];
  let i = 0;
  let block = null;
  const state = { quote: null, opensAt: YAML_VALUE_START };
  for (const line of src.split('\n')) {
    if (block && (line.trim() === '' || indentOf(line) > block.indent)) {
      if (block.shell) lineHashes(line, i, out, { quote: null, opensAt: SHELL_WORD_START });
      i += line.length + 1;
      continue;
    }
    block = null;
    lineHashes(line, i, out, state);
    const m = !state.quote && line.match(BLOCK_SCALAR);
    if (m) block = { indent: indentOf(line), shell: m[2] === 'run' };
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

export function commentCounts(root) {
  const counts = {};
  for (const f of sourceFiles(root)) {
    const n = findComments(readFileSync(join(root, f), 'utf8'), kindOf(f)).length;
    if (n) counts[f] = n;
  }
  return counts;
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
