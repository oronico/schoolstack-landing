# 0017. How the tests are built

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Unit tests, verify scripts and Cucumber steps all load the same modules in
`js/` and `tools/lib/`, so one implementation is checked several ways and no
rule has two. (CLAUDE.md §3)

## Decisions

1. The unit tests for the calculator and Enrollment Audit load the files the
   browser runs, `js/budget-calculator.js` and `js/enrollment-audit.js`, and
   every expected figure is worked by hand before it is asserted.
2. Every rule test in `tools/lib/*.test.mjs` checks both ways: input that
   must pass and input that must fail. A rule tested only on the current
   page would still pass if its regex matched nothing.
3. In `enrollment-audit.test.mjs`, `allIds` is every `ITEMS` id, which is
   what a tuition school with no grade filter sees (`BLANK`).
4. `cucumber.mjs` loads steps with `import`, because the repo is ESM, and
   uses the `progress` and `summary` formatters, which read well in a CI log
   with no TTY. It sets `strict: true`, so a step with no definition fails
   rather than passing as skipped.
5. `features/support/world.mjs` serves the site and starts Chromium once per
   run, not per scenario, so the suite is fast enough that people run it.
   It raises the step timeout to 60s, because starting Chromium and loading
   the page take longer than the 5s default.
6. The step that refuses a bad value in each of the four calculator fields
   lives once, in `budget-calculator.steps.mjs`; a second copy in
   `break-even.steps.mjs` would make Cucumber report an ambiguous step.
7. `page.steps.mjs` takes its file checks from `tools/lib/page-audit.mjs`,
   but asks the browser which face it painted, because only a browser can
   say.
8. verify-form and the signup steps share one submit driver,
   `tools/lib/form-scenario.mjs`. It replaces `window.fetch` per scenario,
   not the network layer, so the page's own handler runs unchanged and each
   check is about what that handler did.
9. Each signup `When` step reloads the page before it submits, because a
   form already replaced by its thank-you panel cannot be sent again.
10. `voice.steps.mjs` adds the planning-only disclaimer to every sample, so a
    Scenario Outline row tests only its own rule. It names a surface
    (headline, CTA, `og:title`, body) and wraps the copy in markup itself,
    because a Gherkin `{string}` cannot hold the double quotes markup needs.
11. `tools/verify-a11y.mjs` is written by hand, not built on axe-core,
    because adding a package needs the owner (CLAUDE.md §6). It covers what
    needs a laid-out page: rendered contrast, landmarks, the skip link,
    labels, `autocomplete` and focus rings.
12. `tools/verify-content.mjs` checks what no browser can see: `_redirects`
    status codes, JSON-LD against the visible FAQ, files only metadata names
    (`og:image`, manifest icons), voice rules, anchors, asset names and
    versions, privacy promises, fonts and comments. It needs no browser,
    server or network, and exits non-zero naming the file and the values.
