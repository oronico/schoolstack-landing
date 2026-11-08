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
