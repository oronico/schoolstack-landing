export const FILL = `
  form.querySelector('#firstName').value = 'Ada';
  form.querySelector('#email').value = 'ada@example.org';
  form.querySelector('#schoolName').value = 'Lovelace Microschool';
  form.querySelector('#schoolState').value = 'Ohio';
  form.querySelector('#accountingPlatform').value = 'QuickBooks Online';
`;

export const ANSWERS = {
  firstName: 'Ada',
  email: 'ada@example.org',
  schoolName: 'Lovelace Microschool',
  schoolState: 'Ohio',
  accountingPlatform: 'QuickBooks Online',
};

export const APPLICATION = {
  form: 'signupForm', button: 'submitBtn', error: 'formError', success: 'formSuccess',
  box: 'signup', fill: FILL,
};

export const MODES = {
  ok: 'the submission succeeds',
  'server-error': 'the server answers 500',
  'network-error': 'the network drops',
  'in-flight': 'the request never settles',
  retry: 'the server answers 500, then they try again',
};

export function scenario(mode, { fill = true, target = APPLICATION } = {}) {
  const t = target;
  return `(async () => {
    const form = document.getElementById('${t.form}');
    const btn = document.getElementById('${t.button}');
    const errorEl = document.getElementById('${t.error}');
    const successEl = document.getElementById('${t.success}');
    const initialLabel = btn.textContent;
    const calls = [];

    window.fetch = (url, opts = {}) => {
      const headers = opts.headers || {};
      calls.push({
        url: String(url),
        method: opts.method,
        contentType: headers['Content-Type'] || headers['content-type'],
        body: String(opts.body || ''),
      });
      if ('${mode}' === 'ok') return Promise.resolve({ ok: true, status: 200 });
      if ('${mode}' === 'server-error') return Promise.resolve({ ok: false, status: 500 });
      if ('${mode}' === 'retry') return Promise.resolve(calls.length === 1 ? { ok: false, status: 500 } : { ok: true, status: 200 });
      if ('${mode}' === 'network-error') return Promise.reject(new TypeError('Failed to fetch'));
      return new Promise(() => {});          // in flight, never settles
    };

    ${fill ? t.fill : ''}
    btn.click();
    await new Promise((r) => setTimeout(r, 150));
    const states = [document.getElementById('${t.box}').getAttribute('data-state')];
    if ('${mode}' === 'retry') {
      btn.click();
      await new Promise((r) => setTimeout(r, 150));
      states.push(document.getElementById('${t.box}').getAttribute('data-state'));
    }

    const shown = (el) => getComputedStyle(el).display !== 'none';
    const values = {};
    for (const el of form.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
      if (el.type === 'checkbox') values[el.name] = el.checked;
      else if (el.name) values[el.name] = el.value;
    }
    return JSON.stringify({
      calls,
      values,
      initialLabel,
      label: btn.textContent,
      disabled: btn.disabled,
      formShown: shown(form),
      successShown: shown(successEl),
      errorShown: shown(errorEl),
      errorText: errorEl.textContent.trim(),
      state: document.getElementById('${t.box}').getAttribute('data-state'),
      states,
    });
  })()`;
}
