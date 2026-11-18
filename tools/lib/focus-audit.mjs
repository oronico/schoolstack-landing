/**
 * Can a keyboard user see where they are?
 *
 * verify-a11y measures text contrast, but until November 2026 nothing looked
 * at the focus ring itself, and two rings went invisible that way: the
 * consent checkbox's ring was ink on the ink application band, and the
 * thank-you panel's ring was accent yellow on paper at 1.6:1. Cursor Bugbot
 * found both after the merge (PR #39). An earlier case, before any check,
 * left tabbing through the nav "moving an invisible cursor".
 *
 * FOCUS_PROBE runs in the page after a real Tab keypress, so :focus-visible
 * applies exactly as it does for a visitor. It reports the focused element's
 * outline and the contrast of that outline against what it is drawn over.
 * WCAG 2.2 asks 3:1 for a focus indicator (1.4.11, 2.4.13).
 */

export const MIN_RING_RATIO = 3;
export const MIN_RING_WIDTH = 2;

export const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return JSON.stringify(null);
  const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // The ring is drawn outside the element (outline-offset), over whatever
  // its parents paint, so the backdrop search starts one level up.
  const backdrop = () => {
    for (let n = el.parentElement; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const cs = getComputedStyle(el);
  const ring = rgb(cs.outlineColor).slice(0, 3);
  const back = backdrop();
  const [a, b] = [lum(ring), lum(back)].sort((x, y) => y - x);
  const r = el.getBoundingClientRect();
  return JSON.stringify({
    label: (el.getAttribute('aria-label') || el.id || el.name || (el.textContent || '').trim() || el.tagName).slice(0, 45),
    tag: el.tagName.toLowerCase(),
    style: cs.outlineStyle,
    width: parseFloat(cs.outlineWidth) || 0,
    color: cs.outlineColor,
    on: 'rgb(' + back.join(', ') + ')',
    ratio: +((a + 0.05) / (b + 0.05)).toFixed(2),
    shown: r.width > 0 && r.height > 0,
  });
})()`;

/** Why a probed ring fails, or null when a keyboard user can see it. */
export function ringProblem(p) {
  if (!p || !p.shown) return null;
  if (p.style === 'none' || p.width < MIN_RING_WIDTH) return `no visible focus ring (outline ${p.style} ${p.width}px)`;
  if (p.ratio < MIN_RING_RATIO) return `focus ring ${p.ratio}:1 (needs ${MIN_RING_RATIO}:1) - ${p.color} on ${p.on}`;
  return null;
}
