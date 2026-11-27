export const MENU_SCENARIOS = [
  { width: 390, height: 844, text: null },
  { width: 390, height: 500, text: '150%' },
  { width: 844, height: 340, text: '150%' },
];

const STATE = `JSON.stringify((() => {
  const menu = document.getElementById('nav-menu');
  const summary = menu && menu.querySelector('summary');
  const rect = (e) => { const q = e.getBoundingClientRect(); return { top: q.top, bottom: q.bottom, left: q.left, right: q.right }; };
  return menu ? {
    open: menu.open,
    summary: summary ? rect(summary) : null,
    focusOnSummary: document.activeElement === summary,
  } : null;
})())`;

const REACH = `JSON.stringify((() => {
  const menu = document.getElementById('nav-menu');
  const panel = menu && [...menu.children].find((e) => e.tagName !== 'SUMMARY');
  const links = panel ? [...panel.querySelectorAll('a')] : [];
  const last = links[links.length - 1];
  if (!last) return { last: null };
  last.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  const q = last.getBoundingClientRect();
  const x = (q.left + q.right) / 2, y = (q.top + q.bottom) / 2;
  const hit = document.elementFromPoint(x, y);
  return {
    last: last.textContent.trim(),
    bottom: Math.round(q.bottom),
    viewport: innerHeight,
    reachable: q.bottom <= innerHeight + 0.5 && !!hit && last.contains(hit),
    panelScrolls: panel.scrollHeight > panel.clientHeight,
  };
})())`;

const OUTSIDE_POINTS = `JSON.stringify((() => {
  const menu = document.getElementById('nav-menu');
  const panel = [...menu.children].find((e) => e.tagName !== 'SUMMARY');
  const summary = menu.querySelector('summary');
  const within = (q, x, y) => x >= q.left && x <= q.right && y >= q.top && y <= q.bottom;
  const live = (e) => e.closest('a, button, input, select, textarea, label, video, iframe, [tabindex]');
  const name = (e) => summary.contains(e) ? 'the scrim' : e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '');
  const p = panel.getBoundingClientRect();
  const s = summary.getBoundingClientRect();
  const outside = (x, y) => {
    if (within(p, x, y) || within(s, x, y)) return null;
    const e = document.elementFromPoint(x, y);
    if (!e || panel.contains(e)) return null;
    if (live(e) && !summary.contains(e)) return null;
    return { x, y, on: name(e) };
  };
  const points = [];
  for (let y = Math.ceil(p.bottom) + 12; y < innerHeight - 4; y += 8) {
    const hit = outside(innerWidth / 2, y);
    if (hit) { points.push(hit); break; }
  }
  const brand = menu.closest('nav').firstElementChild.getBoundingClientRect();
  const bar = outside((brand.right + s.left) / 2, (s.top + s.bottom) / 2);
  if (bar) points.push({ ...bar, on: 'the nav bar' });
  return points;
})())`;

async function tap(browser, x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) {
    await browser.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  }
}

async function key(browser, name, code) {
  for (const type of ['keyDown', 'keyUp']) {
    await browser.send('Input.dispatchKeyEvent', { type, key: name, code: name, windowsVirtualKeyCode: code, nativeVirtualKeyCode: code });
  }
}

async function openMenu(browser, sleep) {
  const s = await browser.evaluate(STATE);
  if (!s || !s.summary) return null;
  if (!s.open) {
    await tap(browser, (s.summary.left + s.summary.right) / 2, (s.summary.top + s.summary.bottom) / 2);
    await sleep(150);
  }
  return browser.evaluate(STATE);
}

export async function auditPhoneMenu(browser, sleep) {
  const problems = [];
  const opened = await openMenu(browser, sleep);
  if (!opened) return { problems: ['the page has no #nav-menu with a summary'], log: '' };
  if (!opened.open) return { problems: ['tapping "Menu" did not open the menu'], log: '' };

  const reach = await browser.evaluate(REACH);
  if (!reach.last) problems.push('the open menu has no links');
  else if (!reach.reachable) {
    problems.push(`the last menu link, "${reach.last}", cannot be scrolled into view: it ends at ${reach.bottom}px on a ${reach.viewport}px screen`);
  }

  const points = await browser.evaluate(OUTSIDE_POINTS);
  const taps = [];
  if (!points.length) problems.push('there is nowhere outside the open menu to tap');
  for (const point of points) {
    const before = await openMenu(browser, sleep);
    if (!before || !before.open) { problems.push('tapping "Menu" did not open the menu again'); break; }
    await tap(browser, point.x, point.y);
    await sleep(150);
    const after = await browser.evaluate(STATE);
    const where = `${point.on} at ${Math.round(point.y)}px`;
    taps.push(`tap on ${where} ${after.open ? 'left it open' : 'closed it'}`);
    if (after.open) problems.push(`a tap outside the menu (on ${where}) left it open`);
  }
  const outsideLog = taps.join(', ') || 'no point outside the panel';

  const again = await openMenu(browser, sleep);
  if (again && again.open) {
    await key(browser, 'Escape', 27);
    await sleep(100);
    const esc = await browser.evaluate(STATE);
    if (esc.open) problems.push('Escape left the menu open');
    else if (!esc.focusOnSummary) problems.push('Escape closed the menu but did not return focus to "Menu"');
  }

  const log = reach.last
    ? `last link "${reach.last}" ${reach.reachable ? 'reachable' : 'cut off'}${reach.panelScrolls ? ' (panel scrolls)' : ''}, ${outsideLog}`
    : outsideLog;
  return { problems, log };
}
