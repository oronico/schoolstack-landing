export function anchorTargets(html, { home = false } = {}) {
  const out = new Map();
  const re = home ? /href="\/#([A-Za-z][\w:.-]*)"/g : /href="#([A-Za-z][\w:.-]*)"/g;
  html.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      if (!out.has(m[1])) out.set(m[1], []);
      out.get(m[1]).push(i + 1);
    }
  });
  return out;
}

export function elementIds(html) {
  const out = new Set();
  for (const m of html.matchAll(/\sid="([A-Za-z][\w:.-]*)"/g)) out.add(m[1]);
  return out;
}

export function danglingAnchors(html, homeHtml = html) {
  const ids = elementIds(html);
  const homeIds = elementIds(homeHtml);
  const out = [];
  for (const [target, lines] of anchorTargets(html)) {
    if (!ids.has(target)) out.push({ target, lines });
  }
  for (const [target, lines] of anchorTargets(html, { home: true })) {
    if (!homeIds.has(target)) out.push({ target: '/#' + target, lines });
  }
  return out;
}

export function pageChrome(html) {
  const pick = (tag) => (html.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`)) || [''])[0]
    .replace(/href="\/#/g, 'href="#')
    .replace(/\s+aria-current="page"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { nav: pick('nav'), footer: pick('footer') };
}

export function chromeDrift(htmlA, htmlB) {
  const a = pageChrome(htmlA);
  const b = pageChrome(htmlB);
  const out = [];
  for (const part of ['nav', 'footer']) {
    if (!a[part] || !b[part]) { out.push(`${part}: missing on one page`); continue; }
    if (a[part] === b[part]) continue;
    let i = 0;
    while (i < a[part].length && a[part][i] === b[part][i]) i++;
    out.push(`${part}: first differs at "${a[part].slice(Math.max(0, i - 30), i + 50)}" vs "${b[part].slice(Math.max(0, i - 30), i + 50)}"`);
  }
  return out;
}

export function unsafeBlankLinks(html) {
  const out = [];
  html.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/<a\b[^>]*target="_blank"[^>]*>/gi)) {
      if (!/\brel="[^"]*\bnoopener\b/i.test(m[0])) {
        out.push({ line: i + 1, tag: m[0].slice(0, 90) });
      }
    }
  });
  return out;
}

export function declaredFontFamilies(html) {
  const out = {};
  for (const m of html.matchAll(/--font-(display|body):\s*'([^']+)'/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

export function servedFontFamilies(css) {
  const out = new Set();
  for (const m of css.matchAll(/font-family:\s*'([^']+)'/g)) out.add(m[1]);
  return out;
}

export const FORMS = [
  { id: 'signupForm', name: 'early-access', label: 'the early list form' },
];

export function formFields(html, id = 'signupForm') {
  const form = (html.match(new RegExp(`<form\\b[^>]*id="${id}"[\\s\\S]*?<\\/form>`)) || [''])[0];
  const out = new Set();
  for (const m of form.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)) {
    if (m[1] !== 'form-name' && m[1] !== 'bot-field') out.add(m[1]);
  }
  return out;
}

export function listedFields(html, formName = null) {
  const scope = formName
    ? (html.match(new RegExp(`<ul\\b[^>]*data-form="${formName}"[\\s\\S]*?<\\/ul>`)) || [''])[0]
    : html;
  return new Set([...scope.matchAll(/data-field="([^"]+)"/g)].map((m) => m[1]));
}

export function privacyFieldDrift(indexHtml, privacyHtml, { id = 'signupForm', name = null } = {}) {
  const sent = formFields(indexHtml, id);
  const listed = listedFields(privacyHtml, name);
  return {
    unlisted: [...sent].filter((f) => !listed.has(f)),
    stale: [...listed].filter((f) => !sent.has(f)),
  };
}

export function cookieUse(text) {
  return /document\.cookie|set-cookie/i.test(text);
}

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

export function faqDrift(sectionHtml, entities, origin = 'https://schoolstack.ai/') {
  const problems = [];
  const visible = new Map();
  for (const m of sectionHtml.matchAll(/<details class="faq-item"([^>]*)>\s*<summary><h3>([\s\S]*?)<\/h3><\/summary>\s*<p>([\s\S]*?)<\/p>/g)) {
    const id = (m[1].match(/\bid="([^"]+)"/) || [])[1];
    const q = stripTags(m[2]);
    if (!id) { problems.push(`the FAQ question "${q}" has no id`); continue; }
    if (visible.has(id)) problems.push(`two FAQ questions share the id ${id}`);
    visible.set(id, { q, a: stripTags(m[3]) });
  }
  const marked = new Map();
  for (const e of entities) {
    const at = e['@id'] || '';
    const id = at.startsWith(origin + '#') ? at.slice(origin.length + 1) : '';
    if (!id) { problems.push(`the JSON-LD question "${e.name}" has no @id of the form ${origin}#<id>`); continue; }
    if (marked.has(id)) problems.push(`two JSON-LD questions share the @id #${id}`);
    marked.set(id, { q: stripTags(e.name), a: stripTags(e.acceptedAnswer.text) });
  }
  for (const id of visible.keys()) if (!marked.has(id)) problems.push(`#${id} is on the page but not in the JSON-LD`);
  for (const id of marked.keys()) if (!visible.has(id)) problems.push(`#${id} is in the JSON-LD but not on the page`);
  for (const [id, v] of visible) {
    const m = marked.get(id); if (!m) continue;
    if (m.q !== v.q) problems.push(`#${id} question differs.\n      markup:  "${m.q}"\n      visible: "${v.q}"`);
    if (m.a !== v.a) problems.push(`#${id} answer differs.\n      markup:  "${m.a}"\n      visible: "${v.a}"`);
  }
  return problems;
}

export const RETIRED_ANCHORS = { 'design-partners': 'early-access', apply: 'early-access', signup: 'early-access' };

export function retiredAnchorLinks(html) {
  const out = [];
  for (const home of [false, true]) {
    for (const [id, lines] of anchorTargets(html, { home })) {
      if (id in RETIRED_ANCHORS) out.push({ id, use: RETIRED_ANCHORS[id], line: lines[0] });
    }
  }
  return out;
}

export function assetHashDrift(paths, readBytes, sha256) {
  const problems = [];
  for (const path of new Set(paths)) {
    const claimed = (path.match(/\.([0-9a-f]{8})\.[a-z0-9]+$/) || [])[1];
    if (!claimed) { problems.push(`${path} is cached for a year but its name carries no content hash`); continue; }
    const actual = sha256(readBytes(path)).slice(0, 8);
    if (actual !== claimed) problems.push(`${path} is named ${claimed} but its content hashes to ${actual}: rename it to match`);
  }
  return problems;
}

export function relativeFileRefs(html) {
  const out = [];
  html.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\b(?:src|srcset|poster)="(?!\/|https?:|data:|#)([^"]+)"/g)) out.push({ ref: m[1], line: i + 1 });
  });
  return out;
}

export function pngSize(bytes) {
  if (bytes.length < 24 || bytes.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: bytes.readUInt32BE(16), h: bytes.readUInt32BE(20) };
}

export function ogImageSizeFault(path, bytes, width, height) {
  const size = pngSize(bytes);
  if (!size) return `og:image ${path} is not a PNG, so its size cannot be read; build-images writes the share card as og-image.png`;
  if (String(size.w) !== width || String(size.h) !== height) return `og:image declares ${width}x${height} but ${path} is ${size.w}x${size.h}`;
  return null;
}

export function pixelFontSizes(css) {
  const found = [];
  let depth = 0;
  let printDepth = null;
  css.split('\n').forEach((line, i) => {
    if (printDepth === null && /@media\s+print\b/.test(line)) printDepth = depth;
    if (printDepth === null) {
      for (const decl of line.matchAll(/font-size\s*:\s*([^;}]*)/g)) {
        for (const m of decl[1].matchAll(/(?<![\w.-])([\d.]+)px\b/g)) found.push({ line: i + 1, px: Number(m[1]) });
      }
    }
    for (const ch of line) {
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (printDepth !== null && depth === printDepth) printDepth = null;
      }
    }
  });
  return found;
}
