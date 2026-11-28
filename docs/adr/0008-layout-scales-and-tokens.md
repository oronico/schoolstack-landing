# 0008. Layout, scales and colour tokens

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

`css/site.css` serves the home, About, Privacy and Terms pages. Enrollment
Audit keeps its own styles in `css/enrollment.css`. CLAUDE.md §4 sets the measures and scales; the
points below are the ones the stylesheet's comments carried.

## Decisions

### Scales

1. Every margin, padding, gap, font size and colour in `site.css` is a token:
   `--sp-1` to `--sp-9` on a 4px base (4, 8, 12, 16, 24, 32, 48, 72, 96px),
   `--step--1` to `--step-4`, and five colours. (CLAUDE.md §4)
2. Each type step is a `clamp()` from a 390px to a 1440px screen.
   `--step--1` is held at 15px, because under the old styles 44% of the home
   page's text was smaller. (CLAUDE.md §4)
3. Each colour has one job. `--ink` (`#1E293B`): text and the ink bands.
   `--paper` (`#FAF9F7`): the page and text on ink. `--muted`: secondary
   text on paper only (2.55:1 on ink fails). `--accent`: the one primary
   action and the "tight" status (8.8:1 with ink). `--alert`: errors and
   "over 100%". (CLAUDE.md §4)
4. `--line` and `--line-on-ink` mix two tokens with `color-mix()`. They are
   for borders only, never behind text, because the contrast check cannot
   read a mixed colour. (CLAUDE.md §4)
5. No gradients and no drop shadows. The one exception is the slider track:
   `render()` in `js/budget-calculator.js` sets `--fill` on each slider, and
   the track paints a hard stop there, because WebKit has no other way to
   colour the filled part. Firefox uses `::-moz-range-progress`. The slider
   input is 44px tall, and the WebKit thumb 26px (30px on coarse pointers).
   (CLAUDE.md §4)

### Measures

6. Every full-width band aligns to `--container` with `--gutter` inside it;
   a band at reading width takes `.section-narrow` and `--measure`. There
   are no other measures. (CLAUDE.md §4)
7. `--gutter` is redefined once, in the 640px query, so no band hardcodes a
   phone gutter and all share one left edge. (CLAUDE.md §4)
8. The nav is full-bleed but pads its contents with
   `max(var(--gutter), calc((100% - var(--container)) / 2 + var(--gutter)))`,
   which lands on `.section`'s left edge at every width with no wrapper.
   `.enroll-band` uses the same formula. (CLAUDE.md §4)

### The logo

9. `--logo-h` is 32px, which makes the horizontal logo 203px wide, over the
   design kit's 200px minimum. It is in px, not rem, so raising the text
   size does not grow the logo and push the menu button off the bar.
   Enrollment Audit's masthead sets the same 32px in its own styles.
   (CLAUDE.md §1)
10. Only the nav logo may narrow, on screens under about 360px where it and
    the menu button do not both fit. It uses `max-height` with `width: auto`
    and `max-width: 100%`, so it keeps its shape. (CLAUDE.md §1)
11. `.tool-logo` works the same way, so large text cannot squash the
    lockups; verify-render checks it at 150% text size. (CLAUDE.md §3)

### Images

12. `img` takes `height: auto`, because every `<img>` carries `width` and
    `height` attributes, and without it an image whose CSS sets only a width
    keeps the attribute height and stretches. (CLAUDE.md §3)

### Bands and parts

13. Band labels, `h2`, `.section-desc` and `.platform-note` in a `.section`
    are centred, like the hero. Text inside cards and lists stays left.
14. The `.label` over a band heading is sentence case, `--muted` and
    `--step--1`: it names the band, and the heading leads.
15. `.btn-primary` is `--accent` and marks the one primary action in a view;
    every other button is ink (`.btn-secondary`). Every "Sign up for early access"
    (hero, early list form, the footer of every page) is `.btn-primary`, one
    style where there were three (owner, November 2026: "One style"). On
    the ink bands (`.signup`, `footer`) its hover turns paper, because an
    ink hover would vanish into the ground. It sets `line-height: inherit`
    because a `<button>` does not inherit it and a link does, so the submit
    button is as tall as the links. `.form-submit` adds only the full width
    and the disabled look. (CLAUDE.md §4)
16. The three `.tool-card`s carry no colour: each product's colour lives in
    its logo artwork. (CLAUDE.md §4)
17. `.enroll-band` is a full-bleed ink band after the calculator. It puts
    text left and the real scorecard image right, so its heading is
    left-aligned, unlike other band headings. (CLAUDE.md §4)
18. Form fields in the ink `.signup` band are paper with ink text, so they
    read as places to type.
19. The FAQ is a list with hairline rules between items, not a stack of
    cards.
20. The incubator and the funders share one `.backing` band. Its `h2` is
    `--step-2`, a step below band headings, because it carries supporting
    facts.
21. `.values` is a 6-column grid where each item spans 2 and the fourth
    starts at column 2, so five values sit three above two, centred. Change
    the rule if the number of values changes.
22. Every in-page link target (`section[id]`, `[id].section`,
    `.anchor-alias`) takes `scroll-margin-top: var(--sp-8)` to clear the
    fixed nav (57px tall, 69px on phones). A `.faq-item` has no padding above
    its heading, so it takes `--sp-9`. verify-render fails a nav link that
    lands its heading under the nav.
23. In `enrollment/index.html` the sticky `.prog` strip appears below 980px,
    the same width where `.score` stops being sticky and drops under the
    practices, so progress stays in view. Keep the two widths together.
24. The footer follows the suite footer spec (owner, 28 November 2026: "all
    footers to have uniform appearance and organization"; section 7 of
    docs/brand/suite-language.md in the Space repo). Four columns at
    1024px and wider, `1.6fr 1fr 1fr 1.6fr`; narrower, two, with the brand
    and "Incubated by" columns spanning both. Those two widths (1024px and
    640px) are the apps' breakpoints, not this site's 900px, so the four
    footers change shape at the same widths. `--step--2` and `--step--3`
    exist for the footer alone. `--text-on-ink` and `--link-on-ink` are
    opaque mixes of paper into ink, not paper with alpha, so the contrast
    check can measure them. The social icons sit in a 44px square, pulled
    left by half the difference between the square and the 24px glyph so
    the glyph lines up with the text above it. On a printed guide the
    columns are hidden except the credit and the email.
    (CLAUDE.md §4)
