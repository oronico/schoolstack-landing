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
