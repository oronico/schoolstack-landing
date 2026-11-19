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
 * applies exactly as it does for a visitor. It reports the ring a visitor
 * sees and the contrast of that ring against what it is drawn over. A
 * control can hide itself and draw its ring on the label beside it
 * (Enrollment Path's answer buttons and grade chips: an opacity:0 input,
 * then a span), so a hidden control is measured by that sibling's ring, as
 * Codex pointed out on #42. An inset ring (negative outline-offset) is
 * drawn over the element's own background, not its parent's.
 * Focus inside a <video>'s own controls (play, menu) is the browser's: it
 * draws those rings in a shadow root the page can neither style nor read, so
 * that stop is skipped: the probe answers { skip: true } and the walk goes
 * on to the next stop. null still means focus has left the page, which ends
 * the walk; Codex caught the first version using null here, which ended it
 * at the video and left the forms below unchecked (#43). The video itself,
 * focused before its controls, is still measured. Chromium's control rings were checked by screenshot.
 * WCAG 2.2 asks 3:1 for a focus indicator (1.4.11, 2.4.13).
 */

export const MIN_RING_RATIO = 3;
export const MIN_RING_WIDTH = 2;

export const FOCUS_PROBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return JSON.stringify(null);
  if (el.matches('video[controls], audio[controls]') && !el.matches(':focus-visible')) return JSON.stringify({ skip: true });
  const rgb = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  // Hidden control: the ring a visitor sees is on the next element.
  const own = getComputedStyle(el);
  const er = el.getBoundingClientRect();
  const hidden = parseFloat(own.opacity) === 0 || er.width * er.height < 4;
  const target = hidden && el.nextElementSibling ? el.nextElementSibling : el;
  // An outside ring sits over whatever the parents paint; an inset ring sits
  // over the element's own background.
  const inset = parseFloat(getComputedStyle(target).outlineOffset) < 0;
  const backdrop = () => {
    for (let n = inset ? target : target.parentElement; n; n = n.parentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c.length >= 3 && (c[3] === undefined || c[3] > 0.95)) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const cs = getComputedStyle(target);
  const ring = rgb(cs.outlineColor).slice(0, 3);
  const back = backdrop();
  const [a, b] = [lum(ring), lum(back)].sort((x, y) => y - x);
  const r = target.getBoundingClientRect();
  return JSON.stringify({
    label: (el.getAttribute('aria-label') || el.id || el.name || (target.textContent || '').trim() || el.tagName).slice(0, 45),
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
  if (!p || p.skip || !p.shown) return null;
  if (p.style === 'none' || p.width < MIN_RING_WIDTH) return `no visible focus ring (outline ${p.style} ${p.width}px)`;
  if (p.ratio < MIN_RING_RATIO) return `focus ring ${p.ratio}:1 (needs ${MIN_RING_RATIO}:1) - ${p.color} on ${p.on}`;
  return null;
}
