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
    if (!ok) return Promise.reject();
    sel.removeAllRanges();
    return Promise.resolve();
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
        btn.textContent = 'Text selected';
        status.textContent = 'Copy did not work here. The text is selected: copy it from your keyboard or menu.';
      }).then(function () {
        setTimeout(function () { btn.textContent = label; status.textContent = ''; }, 2000);
      });
    });
  });
})();
