/**
 * The school budget calculator on the landing page.
 *
 * One file, two readers. The browser loads it as a classic script (the CSP
 * allows script-src 'self', nothing else) and it mounts itself on
 * [data-budget-calculator]. Node `require`s it from
 * tools/lib/budget-calculator.test.mjs and features/, so the arithmetic is
 * tested in the exact code that ships rather than a copy that could drift.
 *
 * Everything runs on the visitor's device. No request leaves the page.
 *
 * Money is held in whole cents so a decimal tuition like $10,000.50 times 50
 * students lands on $500,025.00 exactly, with no floating-point dust. Figures
 * are shown to the nearest dollar.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SchoolStackBudgetCalculator = api;
    if (typeof document !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { api.mountAll(document); });
      } else {
        api.mountAll(document);
      }
    }
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* -------------------------------------------------------------------------
     Settings. The defaults are illustrative starting points, not a standard:
     cost structures differ by school model.
     ------------------------------------------------------------------------- */
  var DEFAULTS = { tuition: 10000, students: 50, facilitiesPct: 15, staffingPct: 60 };

  var LIMITS = {
    tuition: { min: 0, max: 1000000 },     // per student, per year
    students: { min: 0, max: 10000 },
    facilitiesPct: { min: 0, max: 40 },
    staffingPct: { min: 0, max: 90 },
  };

  // Below this share left for everything else, the page suggests a closer look.
  var TIGHT_BELOW_PCT = 15;

  var MESSAGES = {
    over: 'Your facilities and staffing allocations exceed your projected tuition revenue, before accounting for other operating expenses.',
    tight: 'Your remaining operating budget may be tight. Make sure it covers your other expenses and reserves.',
  };

  /* -------------------------------------------------------------------------
     Parsing. Each returns { value, error }: value is null whenever error is set.
     ------------------------------------------------------------------------- */

  // Accepts "10000", "10,000", "$10,000.50", " 9500 ". Rejects anything else.
  function parseTuition(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/[$,\s]/g, '');
    if (s === '') return { value: null, error: 'Enter tuition or funding per student.' };
    if (/^-/.test(s)) return { value: null, error: 'Enter an amount of $0 or more.' };
    if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return { value: null, error: 'Use numbers only, like 10,000 or 9,500.50.' };
    var n = Number(s);
    if (!isFinite(n)) return { value: null, error: 'Use numbers only, like 10,000 or 9,500.50.' };
    if (n > LIMITS.tuition.max) {
      return { value: null, error: 'Enter an amount up to ' + formatUSD(LIMITS.tuition.max) + ' per student.' };
    }
    // Round to the cent: a fourth decimal place is a typo, not a price.
    return { value: Math.round(n * 100) / 100, error: null };
  }

  function parseStudents(raw) {
    var s = String(raw == null ? '' : raw).trim().replace(/[,\s]/g, '');
    if (s === '') return { value: null, error: 'Enter the number of students.' };
    if (/^-/.test(s)) return { value: null, error: 'Enter 0 or more students.' };
    if (/^\d*\.\d*$/.test(s) && s !== '.') {
      // "50.0" is a whole number written long; "50.5" is not.
      if (Number(s) === Math.floor(Number(s))) s = String(Math.floor(Number(s)));
      else return { value: null, error: 'Enter a whole number of students.' };
    }
    if (!/^\d+$/.test(s)) return { value: null, error: 'Use whole numbers only, like 50.' };
    var n = Number(s);
    if (n > LIMITS.students.max) {
      return { value: null, error: 'Enter up to ' + LIMITS.students.max.toLocaleString('en-US') + ' students.' };
    }
    return { value: n, error: null };
  }

  // Sliders cannot leave their range in a browser, but the API can be called
  // with anything, so clamp and round rather than trust the caller.
  function clampPct(v, key) {
    var n = Math.round(Number(v));
    if (!isFinite(n)) n = DEFAULTS[key];
    return Math.min(LIMITS[key].max, Math.max(LIMITS[key].min, n));
  }

  /* -------------------------------------------------------------------------
     The arithmetic. Pure: numbers in, numbers out.
     ------------------------------------------------------------------------- */
  function calculate(input) {
    var tuition = Math.max(0, Number(input.tuition) || 0);
    var students = Math.max(0, Math.floor(Number(input.students) || 0));
    var facilitiesPct = clampPct(input.facilitiesPct, 'facilitiesPct');
    var staffingPct = clampPct(input.staffingPct, 'staffingPct');

    var revenueCents = Math.round(tuition * 100) * students;
    var facilitiesCents = Math.round(revenueCents * facilitiesPct / 100);
    var staffingCents = Math.round(revenueCents * staffingPct / 100);
    // Remaining is what is left after the two allocations, so the three parts
    // always sum back to revenue exactly. Negative means a deficit.
    var remainingCents = revenueCents - facilitiesCents - staffingCents;
    var allocatedPct = facilitiesPct + staffingPct;
    var remainingPct = 100 - allocatedPct;

    var status = remainingPct < 0 ? 'over' : (remainingPct < TIGHT_BELOW_PCT ? 'tight' : 'ok');

    return {
      tuition: tuition,
      students: students,
      revenue: { annual: revenueCents / 100, monthly: revenueCents / 1200 },
      facilities: { pct: facilitiesPct, annual: facilitiesCents / 100, monthly: facilitiesCents / 1200 },
      staffing: { pct: staffingPct, annual: staffingCents / 100, monthly: staffingCents / 1200 },
      remaining: { pct: remainingPct, annual: remainingCents / 100, monthly: remainingCents / 1200 },
      allocatedPct: allocatedPct,
      status: status,
      message: status === 'ok' ? '' : MESSAGES[status],
      bar: barSegments(facilitiesPct, staffingPct),
    };
  }

  /* The stacked bar, as widths in percent of the track. No segment is ever
     negative, and facilities + staffing + remaining always fill the track.
     When the allocations pass 100% the track rescales to the total, a marker
     shows where revenue ends, and `deficit` is the width of the hatched
     overlay from that marker to the end: it lies over the two allocations
     rather than beside them. */
  function barSegments(facilitiesPct, staffingPct) {
    var total = facilitiesPct + staffingPct;
    var scale = Math.max(100, total);
    var w = function (p) { return Math.round(p / scale * 10000) / 100; };
    return {
      facilities: w(facilitiesPct),
      staffing: w(staffingPct),
      remaining: w(Math.max(0, 100 - total)),
      deficit: w(Math.max(0, total - 100)),
      revenueMark: w(100),
    };
  }

  /* -------------------------------------------------------------------------
     Formatting
     ------------------------------------------------------------------------- */
  var usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, minimumFractionDigits: 0 });
  var usdCents = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var plain = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

  // Nearest dollar, and a true minus sign so a deficit reads at a glance.
  function formatUSD(n) {
    var r = Math.round(n);
    if (r === 0) return usd.format(0);
    return (r < 0 ? '−' : '') + usd.format(Math.abs(r));
  }

  // For the tuition box after the visitor leaves it: keeps cents only if typed.
  function formatTuitionField(n) {
    return n % 1 === 0 ? plain.format(n) : usdCents.format(n);
  }

  function formatPct(n) {
    return (n < 0 ? '−' : '') + Math.abs(n) + '%';
  }

  /* -------------------------------------------------------------------------
     The component. Finds its parts by data-calc attributes, so the markup in
     index.html owns the layout and copy and this file owns behaviour.
     ------------------------------------------------------------------------- */
  function mount(el) {
    if (!el || el.__budgetCalc) return null;
    var q = function (name) { return el.querySelector('[data-calc="' + name + '"]'); };
    var parts = {
      tuition: q('tuition'), students: q('students'),
      facilities: q('facilities'), staffing: q('staffing'),
      tuitionError: q('tuition-error'), studentsError: q('students-error'),
      reset: q('reset'), alert: q('alert'), bar: q('bar'), deficitLegend: q('deficit-legend'),
      remainingLegend: q('remaining-legend'),
    };
    if (!parts.tuition || !parts.students || !parts.facilities || !parts.staffing) return null;

    var last = { tuition: DEFAULTS.tuition, students: DEFAULTS.students };

    function setText(name, value) {
      var nodes = el.querySelectorAll('[data-out="' + name + '"]');
      for (var i = 0; i < nodes.length; i++) {
        if (nodes[i].textContent !== value) nodes[i].textContent = value;
      }
    }

    function showFieldError(input, errorEl, message) {
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        errorEl.textContent = message;
        errorEl.hidden = false;
      } else {
        input.removeAttribute('aria-invalid');
        errorEl.textContent = '';
        errorEl.hidden = true;
      }
    }

    function render() {
      var t = parseTuition(parts.tuition.value);
      var s = parseStudents(parts.students.value);
      showFieldError(parts.tuition, parts.tuitionError, t.error);
      showFieldError(parts.students, parts.studentsError, s.error);
      // An invalid entry keeps the last good figure on screen rather than
      // flashing to $0, and the field says what to change.
      if (!t.error) last.tuition = t.value;
      if (!s.error) last.students = s.value;
      el.toggleAttribute('data-stale', !!(t.error || s.error));

      var r = calculate({
        tuition: last.tuition, students: last.students,
        facilitiesPct: parts.facilities.value, staffingPct: parts.staffing.value,
      });

      setText('revenue', formatUSD(r.revenue.annual));
      setText('revenue-monthly', formatUSD(r.revenue.monthly));
      setText('revenue-formula', formatUSD(r.tuition) + ' × ' + plain.format(r.students) + (r.students === 1 ? ' student' : ' students'));

      ['facilities', 'staffing', 'remaining'].forEach(function (k) {
        setText(k + '-pct', formatPct(r[k].pct));
        setText(k + '-annual', formatUSD(r[k].annual));
        setText(k + '-monthly', formatUSD(r[k].monthly));
      });
      setText('deficit-pct', formatPct(Math.max(0, r.allocatedPct - 100)));
      setText('deficit-annual', formatUSD(Math.min(0, r.remaining.annual)));

      parts.facilities.setAttribute('aria-valuetext',
        r.facilities.pct + ' percent, ' + formatUSD(r.facilities.annual) + ' a year');
      parts.staffing.setAttribute('aria-valuetext',
        r.staffing.pct + ' percent, ' + formatUSD(r.staffing.annual) + ' a year');

      if (parts.bar) {
        parts.bar.style.setProperty('--w-facilities', r.bar.facilities + '%');
        parts.bar.style.setProperty('--w-staffing', r.bar.staffing + '%');
        parts.bar.style.setProperty('--w-remaining', r.bar.remaining + '%');
        parts.bar.style.setProperty('--w-deficit', r.bar.deficit + '%');
        parts.bar.style.setProperty('--revenue-mark', r.bar.revenueMark + '%');
        parts.bar.setAttribute('aria-label',
          'Facilities ' + r.facilities.pct + '%, staffing ' + r.staffing.pct + '%, '
          + (r.status === 'over'
            ? 'over revenue by ' + (r.allocatedPct - 100) + '%'
            : 'remaining ' + r.remaining.pct + '%') + '.');
      }
      el.setAttribute('data-status', r.status);
      // Past 100% the legend swaps "Everything else" for "Over revenue", so
      // the same shortfall is not listed twice.
      if (parts.deficitLegend) parts.deficitLegend.hidden = r.status !== 'over';
      if (parts.remainingLegend) parts.remainingLegend.hidden = r.status === 'over';

      // Only rewrite the live region when the message changes, so a screen
      // reader hears it once rather than on every slider step.
      if (parts.alert && parts.alert.textContent !== r.message) parts.alert.textContent = r.message;
      return r;
    }

    function reset() {
      parts.tuition.value = formatTuitionField(DEFAULTS.tuition);
      parts.students.value = String(DEFAULTS.students);
      parts.facilities.value = String(DEFAULTS.facilitiesPct);
      parts.staffing.value = String(DEFAULTS.staffingPct);
      render();
    }

    ['input', 'change'].forEach(function (ev) {
      parts.tuition.addEventListener(ev, render);
      parts.students.addEventListener(ev, render);
      parts.facilities.addEventListener(ev, render);
      parts.staffing.addEventListener(ev, render);
    });
    // Tidy the tuition box once the visitor is done with it: "10000" -> "10,000".
    parts.tuition.addEventListener('blur', function () {
      var t = parseTuition(parts.tuition.value);
      if (!t.error) parts.tuition.value = formatTuitionField(t.value);
    });
    parts.students.addEventListener('blur', function () {
      var s = parseStudents(parts.students.value);
      if (!s.error) parts.students.value = String(s.value);
    });
    if (parts.reset) parts.reset.addEventListener('click', reset);

    el.__budgetCalc = { render: render, reset: reset };
    el.setAttribute('data-ready', '');
    render();
    return el.__budgetCalc;
  }

  function mountAll(doc) {
    var nodes = doc.querySelectorAll('[data-budget-calculator]');
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  return {
    DEFAULTS: DEFAULTS,
    LIMITS: LIMITS,
    TIGHT_BELOW_PCT: TIGHT_BELOW_PCT,
    MESSAGES: MESSAGES,
    parseTuition: parseTuition,
    parseStudents: parseStudents,
    calculate: calculate,
    barSegments: barSegments,
    formatUSD: formatUSD,
    formatPct: formatPct,
    formatTuitionField: formatTuitionField,
    mount: mount,
    mountAll: mountAll,
  };
});
