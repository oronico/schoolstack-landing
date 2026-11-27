export const MIN_EDGE_RATIO = 3;

export const CONTROL_EDGE_AUDIT = `JSON.stringify((() => {
  const rgba = (s) => (s.match(/[\\d.]+/g) || []).map(Number);
  const opaque = (c) => c.length >= 3 && (c[3] === undefined || c[3] > 0.95);
  const lum = ([r, g, b]) => {
    const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrast = (x, y) => {
    const [a, b] = [lum(x), lum(y)].sort((p, q) => q - p);
    return +((a + 0.05) / (b + 0.05)).toFixed(2);
  };
  const css = (c) => 'rgb(' + c.slice(0, 3).join(', ') + ')';
  const shown = (e) => {
    const q = e.getBoundingClientRect();
    const cs = getComputedStyle(e);
    return q.width > 0 && q.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const sides = (e) => {
    const cs = getComputedStyle(e);
    return ['Top', 'Right', 'Bottom', 'Left']
      .map((s) => ({ w: parseFloat(cs['border' + s + 'Width']) || 0, style: cs['border' + s + 'Style'], c: rgba(cs['border' + s + 'Color']) }))
      .filter((b) => b.w > 0 && b.style !== 'none' && b.style !== 'hidden' && opaque(b.c));
  };
  const ground = (e) => {
    for (let n = e.parentElement; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = rgba(cs.backgroundColor);
      if (opaque(c)) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const drawnBy = (input) => {
    let n = input.nextElementSibling;
    for (let i = 0; n && i < 4; i++, n = n.parentElement) if (sides(n).length) return n;
    return input.nextElementSibling;
  };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''))
    + ' "' + (e.getAttribute('aria-label') || e.textContent || e.value || '').trim().replace(/\\s+/g, ' ').slice(0, 24) + '"';

  const NATIVE = ['radio', 'checkbox', 'range', 'hidden', 'file', 'submit', 'button', 'reset', 'image', 'color'];
  const targets = new Set();
  for (const el of document.querySelectorAll('input, select, textarea')) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (el.tagName === 'INPUT' && (type === 'radio' || type === 'checkbox') && +getComputedStyle(el).opacity === 0) {
      const t = drawnBy(el);
      if (t && shown(t)) targets.add(t);
      continue;
    }
    if (el.tagName === 'INPUT' && NATIVE.includes(type)) continue;
    if (shown(el)) targets.add(el);
  }

  const controls = [];
  let unchecked = 0;
  for (const t of targets) {
    const on = ground(t);
    if (!on) { unchecked++; continue; }
    const edges = sides(t);
    const fill = rgba(getComputedStyle(t).backgroundColor);
    const fillRatio = opaque(fill) ? contrast(fill, on) : 1;
    const weakest = edges.map((b) => ({ c: b.c, r: contrast(b.c, on) })).sort((x, y) => x.r - y.r)[0];
    controls.push({
      name: name(t),
      edge: weakest ? css(weakest.c) : 'none',
      edgeRatio: weakest ? weakest.r : 1,
      fill: opaque(fill) ? css(fill) : 'transparent',
      fillRatio,
      on: css(on),
    });
  }
  return {
    dark: matchMedia('(prefers-color-scheme: dark)').matches,
    controls,
    unchecked,
  };
})())`;

export function edgeProblem(c, min = MIN_EDGE_RATIO) {
  if (Math.max(c.edgeRatio, c.fillRatio) >= min) return null;
  return `control edge ${c.edgeRatio}:1 (needs ${min}:1) - ${c.edge} on ${c.on}, fill ${c.fill} ${c.fillRatio}:1 - ${c.name}`;
}
