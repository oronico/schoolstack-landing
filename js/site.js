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
