import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export const COMMENT_DEBT = {
  'fonts/fonts.css': 1,
};

const KIND = [
  [/\.(m?js)$/, 'js'],
  [/\.css$/, 'css'],
  [/\.(html|xml)$/, 'html'],
  [/(\.ya?ml|\.toml)$/, 'config'],
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

function jsRanges(src, from = 0, to = src.length) {
  const out = [];
  let i = from;
  let prev = '';
  const braces = [];
  const parens = [];
  if (src.startsWith('#!', i)) while (i < to && src[i] !== '\n') i++;

  const regexAllowed = () => {
    if (prev === '' || prev === 'ctl)') return true;
    if (/^[\w$]+$/.test(prev)) return REGEX_AFTER_WORD.has(prev);
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
      if (src[i] === '$' && src[i + 1] === '{') { i += 2; braces.push('tpl'); return; }
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
    if (c === '`') { skipTemplate(); prev = 'str'; continue; }
    if (c === '/' && regexAllowed()) { skipRegex(); prev = 'str'; continue; }
    if (c === '(') { parens.push(CONTROL_WORDS.has(prev)); prev = c; i++; continue; }
    if (c === ')') { prev = parens.pop() ? 'ctl)' : c; i++; continue; }
    if (c === '{') { braces.push('{'); prev = c; i++; continue; }
    if (c === '}') {
      const top = braces.pop();
      i++;
      if (top === 'tpl') { resumeTemplate(); prev = 'str'; } else prev = c;
      continue;
    }
    if (/[\w$]/.test(c)) {
      const s = i;
      while (i < to && /[\w$]/.test(src[i])) i++;
      prev = src.slice(s, i);
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
  const re = /<!--[\s\S]*?-->|<(script|style)\b([^>]*)>([\s\S]*?)<\/\1\s*>/gi;
  for (const m of src.matchAll(re)) {
    if (m[0].startsWith('<!--')) { out.push([m.index, m.index + m[0].length]); continue; }
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

function configRanges(src) {
  const out = [];
  let i = 0;
  for (const line of src.split('\n')) {
    let quote = null;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (quote) {
        if (c === '\\' && quote === '"') j++;
        else if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === '#' && (j === 0 || /\s/.test(line[j - 1]))) {
        out.push([i + j, i + line.length]);
        break;
      }
    }
    i += line.length + 1;
  }
  return out;
}

const RANGES = { js: jsRanges, css: cssRanges, html: htmlRanges, hash: hashRanges, config: configRanges };

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
