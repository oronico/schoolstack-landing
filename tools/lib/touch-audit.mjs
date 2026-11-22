export const TOUCH_AUDIT = `JSON.stringify((() => {
  const shown = (e) => { const q = e.getBoundingClientRect(); return q.width > 0 && q.height > 0 && getComputedStyle(e).visibility !== 'hidden'; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : ''))
    + ' "' + (e.textContent || e.value || '').trim().replace(/\\s+/g, ' ').slice(0, 24) + '"';
  const controls = [...document.querySelectorAll('button, a, select, input:not([type=radio]):not([type=checkbox]):not([type=hidden]), label:has(> input[type=radio]), label:has(> input[type=checkbox])')]
    .filter(shown)
    .filter((e) => !e.classList.contains('skip-link'))
    .filter((e) => !(e.tagName === 'A' && getComputedStyle(e).display === 'inline'));
  const fields = [...document.querySelectorAll('input:not([type=radio]):not([type=checkbox]):not([type=hidden]), select, textarea')].filter(shown);
  return {
    coarse: matchMedia('(pointer: coarse)').matches,
    controls: controls.length,
    short: controls.filter((e) => e.getBoundingClientRect().height < 44).map((e) => name(e) + ' ' + Math.round(e.getBoundingClientRect().height) + 'px'),
    smallText: fields.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => name(e) + ' ' + getComputedStyle(e).fontSize),
  };
})())`;
