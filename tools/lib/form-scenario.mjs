/**
 * The signup form driver, shared by verify-form.mjs and the Cucumber steps.
 *
 * It was inline in verify-form.mjs until the feature files needed the same
 * four submit outcomes. Two copies of a fetch stub would drift, and the drift
 * would be invisible: both suites would still go green while asserting
 * different things.
 *
 * The stub replaces window.fetch rather than intercepting at the network layer,
 * so the page's own submit handler runs untouched and every assertion is about
 * what it did.
 */

export const FILL = `
  form.querySelector('#firstName').value = 'Ada';
  form.querySelector('#email').value = 'ada@example.org';
  form.querySelector('[name="emailConsent"]').checked = true;
`;

/** The four outcomes a visitor can meet, named as the page experiences them. */
export const MODES = {
  ok: 'the submission succeeds',
  'server-error': 'the server answers 500',
  'network-error': 'the network drops',
  'in-flight': 'the request never settles',
};

/**
 * An expression that submits the form under `mode` and reports what the page
 * did. Pass fill:false to submit an empty form, which the browser should
 * refuse outright.
 */
export function scenario(mode, { fill = true } = {}) {
  return `(async () => {
    const form = document.getElementById('signupForm');
    const btn = document.getElementById('submitBtn');
    const errorEl = document.getElementById('formError');
    const successEl = document.getElementById('formSuccess');
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
      if ('${mode}' === 'network-error') return Promise.reject(new TypeError('Failed to fetch'));
      return new Promise(() => {});          // in flight, never settles
    };

    ${fill ? FILL : ''}
    btn.click();
    await new Promise((r) => setTimeout(r, 150));

    const shown = (el) => getComputedStyle(el).display !== 'none';
    return JSON.stringify({
      calls,
      initialLabel,
      label: btn.textContent,
      disabled: btn.disabled,
      formShown: shown(form),
      successShown: shown(successEl),
      errorShown: shown(errorEl),
      errorText: errorEl.textContent.trim(),
    });
  })()`;
}
