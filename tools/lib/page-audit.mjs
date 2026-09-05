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

/* Skip the skip-link's own target and any bare "#" placeholder. */
export function anchorTargets(html) {
  const out = new Map(); // id -> [line, ...]
  html.split('\n').forEach((line, i) => {
    for (const m of line.matchAll(/href="#([A-Za-z][\w:.-]*)"/g)) {
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
export function danglingAnchors(html) {
  const ids = elementIds(html);
  const out = [];
  for (const [target, lines] of anchorTargets(html)) {
    if (!ids.has(target)) out.push({ target, lines });
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
