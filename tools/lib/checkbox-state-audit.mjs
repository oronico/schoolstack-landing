export const CHECKBOX_IDS = `JSON.stringify([...document.querySelectorAll('input[type=checkbox]')]
  .filter((i) => { const t = +getComputedStyle(i).opacity === 0 ? i.nextElementSibling : i; if (!t) return false; const q = t.getBoundingClientRect(); return q.width > 0 && q.height > 0; })
  .map((i) => i.id))`;

const DRAWN = `const drawn = (i) => (+getComputedStyle(i).opacity === 0 ? i.nextElementSibling : i.closest('label') || i);`;

export const checkboxPoint = (id) => `JSON.stringify((() => {
  ${DRAWN}
  if (document.activeElement) document.activeElement.blur();
  const t = drawn(document.getElementById(${JSON.stringify(id)}));
  t.scrollIntoView({ block: 'center' });
  const q = t.getBoundingClientRect();
  return { x: Math.round(q.left + q.width / 2), y: Math.round(q.top + q.height / 2), checked: document.getElementById(${JSON.stringify(id)}).checked };
})())`;

export const checkboxLook = (id) => `JSON.stringify((() => {
  ${DRAWN}
  const cs = getComputedStyle(drawn(document.getElementById(${JSON.stringify(id)})));
  return ['backgroundColor', 'borderTopColor', 'borderTopStyle', 'color', 'transform', 'opacity'].map((p) => cs[p]).join(' | ');
})())`;

export const setDisabled = (id, on) => `JSON.stringify((document.getElementById(${JSON.stringify(id)}).disabled = ${on ? 'true' : 'false'}, 0))`;

export const SAVE_STORAGE = `JSON.stringify((window.__savedStorage = JSON.stringify(Object.entries(localStorage)), 0))`;
export const RESTORE_STORAGE = `JSON.stringify((localStorage.clear(), JSON.parse(window.__savedStorage).forEach(([k, v]) => localStorage.setItem(k, v)), 0))`;

export function stateProblems(id, s) {
  const out = [];
  const same = (a, b, what) => { if (s[a] === s[b]) out.push(`#${id}: ${what} looks the same as ${b.replace(/([A-Z])/g, ' $1').toLowerCase()} (${s[a]})`); };
  for (const p of ['', 'Checked']) {
    same('hover' + p, 'default' + p, `hover${p ? ' when checked' : ''}`);
    same('pressed' + p, 'hover' + p, `pressed${p ? ' when checked' : ''}`);
    same('pressed' + p, 'default' + p, `pressed${p ? ' when checked' : ''}`);
  }
  same('defaultChecked', 'default', 'checked');
  for (const p of ['', 'Checked']) if (('disabled' + p) in s) same('disabled' + p, 'default' + p, 'disabled');
  return out;
}

export async function auditCheckboxStates(browser) {
  const mouse = (type, x, y) => browser.send('Input.dispatchMouseEvent',
    { type, x, y, button: 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  const away = () => mouse('mouseMoved', 1, 1);
  const ids = await browser.evaluate(CHECKBOX_IDS);
  const problems = [];
  if (!ids.length) return { count: 0, problems };
  await browser.evaluate(SAVE_STORAGE);
  for (const id of ids) {
    if (!id) { problems.push('a checkbox has no id, so the state check cannot find it again'); continue; }
    const s = {};
    const seen = [];
    for (const pass of [0, 1]) {
      const { x, y, checked } = await browser.evaluate(checkboxPoint(id));
      const p = checked ? 'Checked' : '';
      seen.push(checked);
      await away();
      s['default' + p] = await browser.evaluate(checkboxLook(id));
      if (!pass) {
        await browser.evaluate(setDisabled(id, true));
        s['disabled' + p] = await browser.evaluate(checkboxLook(id));
        await browser.evaluate(setDisabled(id, false));
      }
      await mouse('mouseMoved', x, y);
      s['hover' + p] = await browser.evaluate(checkboxLook(id));
      await mouse('mousePressed', x, y);
      s['pressed' + p] = await browser.evaluate(checkboxLook(id));
      await mouse('mouseReleased', x, y);
    }
    await away();
    if (seen[0] === seen[1]) { problems.push(`#${id}: a click did not change it, so its checked look was not reached`); continue; }
    problems.push(...stateProblems(id, s));
  }
  await browser.evaluate(RESTORE_STORAGE);
  return { count: ids.length, problems };
}
