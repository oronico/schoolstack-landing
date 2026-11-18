/**
 * Behaviour shared by every page. Kept tiny on purpose: the nav menu works
 * without it (a <details> element opens and closes on its own), and this only
 * tidies up after a choice is made.
 *
 *  - Choosing a link in the phone menu closes the menu, so an in-page link
 *    ("The tools") does not leave the panel covering the section it scrolled
 *    to.
 *  - Escape closes the menu and puts focus back on its button.
 *  - Widening the window past the phone layout closes it too.
 */
(function () {
  'use strict';
  var menu = document.querySelector('details.nav-menu');
  if (!menu) return;
  var summary = menu.querySelector('summary');

  menu.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) menu.open = false;
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && menu.open) {
      menu.open = false;
      if (summary) summary.focus();
    }
  });
  if (window.matchMedia) {
    var wide = window.matchMedia('(min-width: 901px)');
    var close = function () { if (wide.matches) menu.open = false; };
    if (wide.addEventListener) wide.addEventListener('change', close);
  }
})();

/**
 * The mailing list signup in the footer of every page. The same shape as the
 * design partner application (CLAUDE.md section 8): one state, named on
 * #newsletter as data-state; VIEW fixes what each state shows; ON lists the
 * events each state answers. Any other event is ignored, so a second Enter
 * while a request is out sends nothing.
 */
(function () {
  'use strict';
  var box = document.getElementById('newsletter');
  var form = document.getElementById('newsletterForm');
  if (!box || !form) return;
  var btn = document.getElementById('newsletterBtn');
  var errorEl = document.getElementById('newsletterError');
  var successEl = document.getElementById('newsletterSuccess');
  var label = btn.textContent;

  var VIEW = {
    idle:       { form: true,  busy: false, error: false, success: false },
    submitting: { form: true,  busy: true,  error: false, success: false },
    failed:     { form: true,  busy: false, error: true,  success: false },
    submitted:  { form: false, busy: false, error: false, success: true }
  };
  var ON = {
    idle:       { SUBMIT: 'submitting' },
    submitting: { SUCCEED: 'submitted', FAIL: 'failed' },
    failed:     { SUBMIT: 'submitting' },
    submitted:  {}
  };
  var state = 'idle';

  function send(event) {
    var next = ON[state][event];
    if (!next) return false;
    state = next;
    var v = VIEW[state];
    box.setAttribute('data-state', state);
    form.hidden = !v.form;
    btn.disabled = v.busy;
    btn.textContent = v.busy ? 'Joining...' : label;
    errorEl.hidden = !v.error;
    successEl.hidden = !v.success;
    return true;
  }

  function writeError() {
    // Written fresh each time, so a screen reader announces the alert.
    errorEl.textContent = '';
    errorEl.appendChild(document.createTextNode("We couldn't add you just now. Please try again or email "));
    var link = document.createElement('a');
    link.href = 'mailto:allison@schoolstack.ai';
    link.textContent = 'allison@schoolstack.ai';
    errorEl.appendChild(link);
    errorEl.appendChild(document.createTextNode('.'));
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!send('SUBMIT')) return;
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(new FormData(form)).toString()
    })
    .then(function (res) {
      if (!res.ok) throw new Error('rejected');
      send('SUCCEED');
      successEl.focus();
    })
    .catch(function () {
      writeError();
      send('FAIL');
    });
  });
})();
