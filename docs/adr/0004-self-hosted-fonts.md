# 0004. Self-hosted brand fonts

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Quicksand (headings) and Nunito (body) are the brand faces shared with Space,
Budget and Access. They are set once, as `--font-display` and `--font-body` in
`css/site.css` `:root`, and must not be swapped. (CLAUDE.md §1)

## Decisions

1. The fonts are served from `fonts/`, not linked from Google. That takes a
   third party out of every visitor's request path and an extra origin out
   of first paint, lets the CSP in `_headers` forbid every outside origin,
   and stops the share card render falling back to DejaVu Sans without a
   word. The OFL permits it. (CLAUDE.md §1)
2. `tools/fetch-fonts.mjs` writes `fonts/fonts.css`. Change `FAMILIES` and
   run it again; do not edit the CSS by hand. `FAMILIES` must name the faces
   `:root` asks for, and verify-content fails when they drift.
3. fetch-fonts asks Google for a weight range, not a list, so each subset
   comes back as one variable file covering every weight. (CLAUDE.md §1)
4. It keeps only the `latin` and `latin-ext` subsets. Cyrillic, Greek and
   Vietnamese would about triple the bytes for glyphs the site never shows.
5. It sends a modern Chrome User-Agent, because Google serves TTF, about
   twice the size, to browsers it takes to be old.
6. It splits Google's CSS on the `/* subset */` comment Google writes before
   each `@font-face`, so it depends on that response format.
7. Pages preload only the latin files; latin-ext loads when a glyph needs it.
8. `enrollment/index.html` sets the faces through `--font-display` and
   `--font-body`, the names the home page uses, so verify-content and
   verify-render check it the same way. `--f-display` and `--f-body` are
   local aliases of them.
9. Two checks are needed, and both stay. `declaredFontFamilies()` reads what
   `:root` asks for and `servedFontFamilies()` what `fonts.css` serves;
   verify-render asks the browser which face it painted. A name drift
   between `site.css` and `fonts.css` loads every file with a 200 and paints
   the site in Trebuchet MS with every other check green. (CLAUDE.md §3)
10. verify-content resolves relative `url()` paths in `fonts/fonts.css`
    against `fonts/`, as the browser does, not against the repo root.
11. `tools/og-image.html` loads the fonts by relative path, because the
    render sandbox cannot reach Google Fonts. (CLAUDE.md §3)
