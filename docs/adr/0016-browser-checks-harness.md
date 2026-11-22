# 0016. The browser checks and their harness

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Several checks need a laid-out page. They share a local server and a
Chromium driver.

## Decisions

1. The server and the DevTools driver live once, in `tools/lib/harness.mjs`,
   because copies drift. `build-images.mjs` and `optimize-images.mjs` still
   carry their own; issue #75 tracks that.
2. `TYPES` in `harness.mjs` must cover every extension the site serves. An
   unknown one goes out as `application/octet-stream`, which `nosniff` makes
   Chromium reject, and that looks like a CSP fault.
3. `serveSite()` serves `about.html` at `/about` and a folder's
   `index.html`, as Netlify does, so pages that work in production do not
   404 in the checks. (CLAUDE.md §5)
4. `evaluate()` passes `awaitPromise` and parses the result as JSON, so each
   check expression returns a JSON string and may be an async function.
5. Removing the temp Chromium profile ignores errors, so a slow browser exit
   cannot fail a run whose checks passed.
6. A check that finds no fault cannot tell a clean page from one that never
   loaded. So each has a floor: `FLOOR` in verify-headers (10 responses, 8
   images, 4,000 characters, the signup form) and `PAGES` in verify-render.
   They are minimums and required ids, not exact counts, so ordinary edits
   pass while a blank or half-drawn page fails. Update them when a page
   truly changes shape.
7. verify-render compares each image's rendered aspect ratio to its natural
   one, because `width` and `height` attributes without `height: auto` once
   squashed an image while a source-level check passed. It checks again
   with the root font size at 150%, because a height in rem grows with text
   while `max-width` caps the width; the tool logos squashed only there
   (#49). (CLAUDE.md §3)
8. verify-calculator drives the snapshot and break-even card in a real
   page, because a blocked or missing script leaves the server-drawn
   defaults, which look right and never move. Facilities 40% plus staffing
   50% leaves 10%, under `TIGHT_BELOW_PCT`, so it must read "tight".
   (CLAUDE.md §3)
9. verify-form's `load()` waits for `document.readyState` to be `complete`,
   because the page binds its submit handler on `DOMContentLoaded`;
   clicking earlier would test a native submit, not the handler.
