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
 *  - A link to a FAQ question opens its answer (second block below).
 */
(function () {
  'use strict';
  var menu = document.getElementById('nav-menu');
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
 * A link to a FAQ question (/#faq-cost) opens its answer. Each question is a
 * <details> with a stable id; browsers scroll to a closed <details> but leave
 * it shut, so a shared link would land on a question with no answer showing.
 */
(function () {
  'use strict';
  function openTarget() {
    var id = location.hash.slice(1);
    var el = id && document.getElementById(id);
    if (el && el.tagName === 'DETAILS') el.open = true;
  }
  openTarget();
  window.addEventListener('hashchange', openTarget);
})();

/**
 * Copy buttons on the giving guide. A button names the <pre> it copies by
 * id (data-copy="prompt-list"). The pattern follows GitHub's
 * clipboard-copy-element: the Clipboard API where the browser has it, and
 * a selection plus execCommand('copy') where it does not. The label reads
 * "Copied" for two seconds, and a polite live region says so for screen
 * readers, which do not announce a button's label changing.
 */
(function () {
  'use strict';
  var buttons = document.querySelectorAll('[data-copy]');
  if (!buttons.length) return;

  var status = document.createElement('p');
  status.className = 'sr-only';
  status.setAttribute('aria-live', 'polite');
  document.body.appendChild(status);

  function fallback(el) {
    var range = document.createRange();
    range.selectNodeContents(el);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    sel.removeAllRanges();
    return ok ? Promise.resolve() : Promise.reject();
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    var label = btn.textContent;
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy'));
      if (!el) return;
      var text = el.textContent;
      var copy = navigator.clipboard && navigator.clipboard.writeText
        ? navigator.clipboard.writeText(text).catch(function () { return fallback(el); })
        : fallback(el);
      copy.then(function () {
        btn.textContent = 'Copied';
        status.textContent = 'Copied to your clipboard.';
      }, function () {
        btn.textContent = 'Select and copy';
        status.textContent = 'Copy did not work here. Select the text and copy it.';
      }).then(function () {
        setTimeout(function () { btn.textContent = label; status.textContent = ''; }, 2000);
      });
    });
  });
})();
