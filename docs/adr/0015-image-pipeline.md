# 0015. The image pipeline

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

`tools/build-images.mjs` renders the favicons and the share card from vector
sources in headless Chromium, so no PNG is edited by hand. It uses the fonts
in `fonts/`, needs no network, and fails if Quicksand or Nunito did not
load. (CLAUDE.md §3)

## Decisions

1. The mark's geometry (a 40-unit box, bars at x=4, 7 tall, widths 20, 27
   and 32) matches the Space and Budget favicons, so the products read as
   one family; keep it in step with them. The parent mark carries all three
   hues. Its amber is `#F59E0B`, darker than the `#FBBF24` used on dark
   grounds, because the lighter one washes out on `#FAF9F7` at 16px.
   (CLAUDE.md §1)
2. `iconSvg()` has three forms: rounded for tab favicons (nothing masks
   them), square for `apple-touch-icon` (iOS rounds it, so a rounded source
   would round twice), and maskable for Android, with the mark scaled to
   0.72 so a circular mask does not clip it.
3. It sets the size with `Emulation.setDeviceMetricsOverride` over the
   DevTools protocol, not `--screenshot`, which sizes the viewport to the
   window minus browser chrome (1200x630 gives 543px of height) and drops
   the bottom of the card.
4. `shoot()` awaits `document.fonts.ready` after `Page.loadEventFired`,
   because web fonts finish after load. It then checks each family is in
   `document.fonts` with status `loaded`, and throws if not: a missing font
   raises no error, and the card once shipped in DejaVu Sans. (CLAUDE.md §3)
5. It waits up to 5 seconds for Chromium to exit before deleting the temp
   profile, because Chromium keeps writing after SIGTERM and an early
   `rmSync` throws `ENOTEMPTY`. A failure to delete is ignored: a leftover
   temp folder does no harm, and must not fail a build that worked.
6. `tools/og-image.html` uses a light ground, not the site's navy, because
   the share card is a first impression. It pins each block absolutely on
   its fixed 1200x630 canvas, so the layout holds however the headline
   wraps.
7. `tools/optimize-images.mjs` uses headless Chromium as its WebP encoder,
   so the repo needs no native image package. It converts only images of
   60 KB or more; below that, the saving is not worth another file to keep
   in step.
8. verify-content reads the real size from the `og:image` PNG header and
   fails if `og:image:width` or `og:image:height` differ, because a wrong
   size gets the card cropped or letterboxed.
9. verify-content lists files in `assets/logos` and `images` that no page
   uses, but does not fail on them, because a brand asset can land ahead of
   the page that uses it (the Enrollment Audit logo, for one).

Issue #75 tracks moving build-images and optimize-images onto
`tools/lib/harness.mjs` (ADR 0016).
