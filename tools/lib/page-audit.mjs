/**
 * Structural facts about the markup that no other check derives.
 *
 * verify-render.mjs asserts a fixed list of ids exists (its EXPECT floor). That
 * catches a page that failed to load; it does not catch a NEW anchor pointing
 * at an id nobody wrote, because the list is hardcoded rather than read off the
 * links. A nav item that scrolls nowhere is invisible in a diff and invisible
 * to every current check.
 *
 * Pure functions over the HTML string, for the same reason as copy-rules.mjs:
 * one implementation, three callers.
 */

/* Skip the skip-link's own target and any bare "#" placeholder.
 *
 * `home: true` collects the other kind: "/#faq", a link from another page to
 * an id on the home page. The About page's nav and footer use those. */
export function anchorTargets(html, { home = false } = {}) {
  const out = new Map(); // id -> [line, ...]
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

/**
 * Anchors whose target does not exist. Each entry names the lines that link to
 * it, so the failure points at the link rather than at the missing id.
 */
export function danglingAnchors(html, homeHtml = html) {
  const ids = elementIds(html);
  const homeIds = elementIds(homeHtml);
  const out = [];
  for (const [target, lines] of anchorTargets(html)) {
    if (!ids.has(target)) out.push({ target, lines });
  }
  // "/#faq" from any page has to land on an id the home page carries.
  for (const [target, lines] of anchorTargets(html, { home: true })) {
    if (!homeIds.has(target)) out.push({ target: '/#' + target, lines });
  }
  return out;
}

/**
 * The site has no templating, so the nav and footer are written out on every
 * page. This is what stops the copies drifting: it returns each page's
 * <nav> and <footer>, normalised for the two differences that are meant to
 * be there - the home page links "#faq" where other pages link "/#faq", and
 * each page marks its own nav item aria-current.
 */
export function pageChrome(html) {
  const pick = (tag) => (html.match(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}>`)) || [''])[0]
    .replace(/href="\/#/g, 'href="#')
    .replace(/\s+aria-current="page"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return { nav: pick('nav'), footer: pick('footer') };
}

/** Where two pages' nav or footer differ, as short readable excerpts. */
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

/**
 * Links that open a new tab without severing the opener.
 *
 * Modern browsers imply rel="noopener" for target="_blank", so this is a
 * belt-and-braces rule rather than a live vulnerability - but the repo sets it
 * on every outbound link today and an inconsistent one is a review distraction.
 */
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

/**
 * The font families the page asks for, in declaration order, read off the
 * custom properties rather than off any one rule that uses them.
 *
 * Paired with the browser-side check in verify-render.mjs: this says what the
 * page WANTS, that says what it GOT. A drift between fonts/fonts.css and these
 * names renders the whole site in Trebuchet MS with every other check green -
 * the same silent fallback that once shipped the OG card in DejaVu Sans.
 */
export function declaredFontFamilies(html) {
  const out = {};
  for (const m of html.matchAll(/--font-(display|body):\s*'([^']+)'/g)) {
    out[m[1]] = m[2];
  }
  return out;
}

/** The @font-face families fonts.css actually serves. */
export function servedFontFamilies(css) {
  const out = new Set();
  for (const m of css.matchAll(/font-family:\s*'([^']+)'/g)) out.add(m[1]);
  return out;
}

/**
 * The privacy policy makes promises the code has to keep. These read both
 * sides so a check can hold them together.
 *
 * formFields: every named input a form submits (the early list form unless
 * another form id is given), minus Netlify's own plumbing
 * (form-name) and the spam trap (bot-field).
 * listedFields: every data-field the privacy page lists, or only those in the
 * list marked data-form="<name>" when a form name is given.
 */

/** The site's Netlify forms, each listed field by field in privacy.html. */
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

/** Where the privacy page and one form disagree, in both directions. */
export function privacyFieldDrift(indexHtml, privacyHtml, { id = 'signupForm', name = null } = {}) {
  const sent = formFields(indexHtml, id);
  const listed = listedFields(privacyHtml, name);
  return {
    unlisted: [...sent].filter((f) => !listed.has(f)),
    stale: [...listed].filter((f) => !sent.has(f)),
  };
}

/** Code that would set or read a cookie, which the privacy page says never happens. */
export function cookieUse(text) {
  return /document\.cookie|set-cookie/i.test(text);
}

/* ---------------------------------------------------------------------------
   Stable ids. Things the site links to, stores or checks are named by an id
   that never changes with their wording or their place in a list.
   ------------------------------------------------------------------------- */

const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/**
 * Pairs the visible FAQ with its JSON-LD by id, not by position, so a reorder
 * is not a failure and a real difference is named by the question it is in.
 * `sectionHtml` is the #faq section; `entities` is FAQPage.mainEntity.
 * Returns the problems found, as sentences.
 */
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

/**
 * Ids that are retired: they still exist so links already shared keep
 * working, but nothing on the site may link to them. The value names the id
 * to link to instead.
 */
export const RETIRED_ANCHORS = { 'design-partners': 'early-access', apply: 'early-access', signup: 'early-access' };

/** Links on a page to a retired id, as `{ id, use, line }`. */
export function retiredAnchorLinks(html) {
  const out = [];
  for (const home of [false, true]) {
    for (const [id, lines] of anchorTargets(html, { home })) {
      if (id in RETIRED_ANCHORS) out.push({ id, use: RETIRED_ANCHORS[id], line: lines[0] });
    }
  }
  return out;
}

/**
 * Files in /assets are cached for a year as immutable, so each one's name
 * must carry the first 8 hex digits of the sha256 of its own bytes. Takes
 * the referenced paths and a reader; returns the problems found.
 */
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

/**
 * Local file references written relative to the page ("images/x.png") instead
 * of from the site root ("/images/x.png"). The same file then has two URLs,
 * and markup moved to another page loads nothing. Returns `{ ref, line }`.
 */
export function relativeFileRefs(html) {
  const out = [];
  html.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/\b(?:src|srcset|poster)="(?!\/|https?:|data:|#)([^"]+)"/g)) out.push({ ref: m[1], line: i + 1 });
  });
  return out;
}
