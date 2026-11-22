# 0003. The CI workflow

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

The faults the checks catch never show in a diff: a CSP that blocks the page
only at Netlify's edge, an image stretched by layout, a `/go/` CTA with no
redirect rule. `.github/workflows/verify.yml` runs them on every pull request
and every push to `main`. (CLAUDE.md §3)

## Decisions

1. A second push to the same branch cancels the run still going for the
   first (`concurrency` with `cancel-in-progress`): its answer no longer
   matters.
2. CI uses Node 22, and `package.json` asks for `>=22`, because
   `tools/lib/harness.mjs` drives Chromium with the global `WebSocket`,
   which older Node lacks.
3. `findChrome()` in `tools/lib/harness.mjs` tries `CHROME_BIN`, then the
   Playwright cache, then the usual system paths. The workflow sets
   `CHROME_BIN` to the runner's own Chrome, and downloads Playwright's
   Chromium only when the image has none.
4. The unit tests run first, then the content check, before any browser
   starts. The unit tests cover `parseHeaders()` and `matches()`, which
   verify-headers relies on to serve the real headers.
5. Every step after the unit tests carries `if: ${{ !cancelled() }}`, so one
   run reports every failing check rather than stopping at the first.
6. The Cucumber suite runs last: it is the slowest, and it drives the same
   `tools/lib/` modules as the checks before it, so a failure there after
   those pass points at a step definition.
