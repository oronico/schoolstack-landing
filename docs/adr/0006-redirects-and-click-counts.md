# 0006. Redirects and click counts

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Netlify Analytics reads CDN request logs. That is the only way the site can
count clicks out to the tools. (CLAUDE.md §5)

## Decisions

1. `www` redirects to the apex with a forced 301, matching
   `<link rel="canonical">`, so ranking is not split across two hostnames.
2. Tool CTAs go through `/go/*`, so each click is a request to schoolstack.ai
   that the CDN logs. (CLAUDE.md §5)
3. `/go/*` rules are 302, never 301. A browser caches a 301, so only a
   person's first click would reach the CDN and the counts would fall short.
   verify-content fails a `/go/` rule that is not a 302. (CLAUDE.md §5)
4. `robots.txt` disallows `/go/`, so crawlers do not add to the counts.
5. `/go/lending-lab` and `/go/screener` stay with nothing on the site linking
   them, so links already shared keep working. `UNLINKED_ON_PURPOSE` in
   `tools/verify-render.mjs` names them as the only rules allowed no CTA.
   (CLAUDE.md §5, §7)
6. verify-render also fails a `/go/` rule that nothing on the home page
   links, because checking links against rules alone stays green when a CTA
   falls off the page.
7. `_redirects` states the `/about`, `/privacy` and `/terms` rewrites Netlify
   would apply anyway, so the rule is written down. `serveSite()` in
   `tools/lib/harness.mjs` serves the same, and verify-render loads `/about`
   by its clean URL so the rewrite is tested with the page. (CLAUDE.md §5)
8. `/enrollment` redirects to `/enrollment/` with a 301, so both addresses
   open the tool under one URL. A 301 is right here: it sets the canonical
   address, and nothing counts these clicks.
9. The footer's tool links go straight to each tool, not through `/go/`
   (November 2026). `/go/` is robots-blocked and a 302, so the links passed
   none of schoolstack.ai's standing to the tools, and no page linked them
   directly. The buttons in the page body stay on `/go/`, so the counts that
   matter still come in; footer clicks are given up. (CLAUDE.md §5)
10. The repo's own files (`CLAUDE.md`, `CHANGELOG.md`, `docs/`, `tools/`,
    `features/` and the rest) are forced to `404.html` with `404!`, because
    Netlify publishes the repo root and robots.txt only asks crawlers not to
    look. A forced rule wins over a file that exists, which a plain rule does
    not. (CLAUDE.md §5)
