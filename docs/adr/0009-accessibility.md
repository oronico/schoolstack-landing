# 0009. Accessibility

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

`verify-a11y` checks contrast, landmarks, the skip link, labels and focus
rings on every page; `verify-calculator` checks tap targets and field sizes.
(CLAUDE.md §3)

## Decisions

### Native controls

1. The phone menu (`#nav-menu`) is a native `<details>`, so it opens and
   closes with no script. `js/site.js` only closes it after a link is
   chosen, on Escape (focus goes back to its summary), and when the window
   widens past 900px.
2. Each FAQ answer is a native `<details>`, so it opens by keyboard and with
   no script, and find-in-page still reaches the hidden text.
3. On a `.tool-card`, `.tool-link::after` covers the card so all of it is
   clickable, but focus and its ring stay on the link.
4. The platform film has `controls` and `preload="none"` and never
   autoplays: it plays when asked, so its voiceover is heard. Captions are
   on by default. (CLAUDE.md §7)
5. `#apply-heading` has `tabindex="-1"`, so a link to it moves focus onto it
   and the next Tab reaches the first field.

### Focus rings

6. Focus rings are 3px `--ink` on paper and `--accent` inside the ink bands
   (`.signup`, `.enroll-band`, footer). The thank-you panel is paper inside
   the ink band, so its ring goes back to `--ink`: accent on paper is only
   1.6:1. (CLAUDE.md §3)
7. In `enrollment/index.html`, rings inside `.mast` use `--mast-fg`, because
   the default blue is 2.64:1 on the navy masthead. A focused, checked
   answer segment draws its inset ring in `currentColor`, because blue on a
   coloured fill was 1.2:1 on red. (CLAUDE.md §3)
8. `FOCUS_PROBE` in `tools/lib/focus-audit.mjs` runs after a real Tab press,
   so `:focus-visible` applies. A control that hides itself (opacity 0 or
   under 4px square) is judged by the ring on its next sibling, and an inset
   ring (negative `outline-offset`) by the element's own fill. A ring must
   be at least 2px wide and 3:1 (WCAG 1.4.11, 2.4.13).
9. Focus inside a video's native controls returns `{ skip: true }`, so the
   walk goes on; `null` means focus left the page and ends it. The page can
   neither style nor read those rings, so Chromium's were checked by
   screenshot.
10. `verify-a11y` turns on `Emulation.setFocusEmulationEnabled` for the whole
    run. Without it, after synthetic Tab presses headless Chrome treats the
    page as unfocused, and a scripted `focus()` on the next page no longer
    shows the skip link.

### Contrast and size

11. `enrollment/index.html` defines `--st-*-t` and `--no-t` text shades for
    small stage and force labels, darker where needed so 11px type clears
    4.5:1 on white. Bars and borders keep the brighter `--st-*` values.
12. In its dark theme, the checked Yes and Not yet segments use dark text,
    as Partly does, because their lighter fills hold white at only 2.9:1.
13. Text inputs are at least 16px, because iOS Safari zooms the page when a
    smaller field takes focus. The calculator uses `--step-1`; Enrollment
    Audit sets 16px under `(pointer: coarse)` and keeps its denser layout
    for a mouse.
14. Every input, button and link in `#budget-calculator` is at least 44px
    tall, and its copy at least 12px; verify-calculator fails anything
    smaller. The break-even "start your enrollment audit" link is
    `inline-flex` with `min-height: 44px` for that reason. Enrollment Audit
    makes every control 44px and every field 16px under `(pointer: coarse)`
    (#52), so iPhone Safari does not zoom the page when a field takes focus.
    verify-a11y opens Enrollment Audit at 390px as a touch screen and fails
    any control under 44px or field under 16px (`tools/lib/touch-audit.mjs`),
    disclosure `<summary>`s included: Bugbot found the "Work them out from
    last year's counts" summary at 33px, now 45px.
    It first asks whether the browser reports a touch screen and fails if
    not, because a failed emulation would pass with empty lists. Links in
    running text (WCAG 2.5.8's inline exception) and the skip link, which
    only a keyboard reaches, are exempt. The logo link in the nav and in
    Enrollment Audit's masthead is a 48px tap target around the 32px logo:
    `--sp-2` of padding above and below, with a matching negative margin, so
    the bar keeps its height and nothing moves.

### Live regions

15. Both calculator `render()` functions write the live region only when its
    text changes, so a screen reader hears a change once, not on every
    slider step or keypress.
16. The three `.calc-guide` messages share one grid cell and only their
    visibility changes, so the box is as tall as the longest and nothing
    below moves. The box is `aria-hidden`; screen readers get the polite
    live region.

### Checkbox states

17. Every checkbox has a distinct default, hover, pressed, focused, checked
    and disabled look. Hover darkens an edge to `--fg` or `--control-edge`,
    the way `.btn:hover` does; a chosen grade chip turns its fill to
    `--muted` instead, because its edge is already its fill. That holds its
    text at 6.05:1 in the light theme and 7.64:1 in the dark;
    `--control-edge` gave only 4.52:1 in the light. Pressed is
    `transform: scale(.97)`: it reads the same in both themes, chosen or
    not, and needs no new colour. The shrink has no transition, so the
    stylesheet's reduced-motion rule has nothing to stop. Disabled is `opacity: .45`, the same as a
    disabled `.btn`. Nothing on the site disables a checkbox today; the rule is one
    line, so a later one does not ship looking live.
18. A force option's box is native, so its tick is drawn in
    `accent-color: var(--fg)`: navy in the light theme, cream in the dark.
    The fixed `--navy` it had was 1.15:1 on the dark row.
19. `checkbox-state-audit.mjs` drives the mouse with real CDP events and a
    real click, then reads the drawn element (the label's span for a hidden
    input, the label for a native one). A press that is dragged off before
    release left Chromium's next press on `<body>`, so each press is
    released in place and the click is the move to the other state; the
    second click puts it back. It saves and restores `localStorage`, so
    the next pass still opens on the example audit.

