# 0005. Security headers and the CSP

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Netlify applies `_headers` at its edge, so neither local development nor the
diff shows a CSP blocking the site's own files. (CLAUDE.md §3, §5)

## Decisions

1. The security headers apply to every path, because partners, funders and
   districts run security scans against schoolstack.ai that look for them.
2. `Strict-Transport-Security` leaves out `includeSubDomains` on purpose: the
   tool subdomains are separate Netlify sites and set their own.
3. `Permissions-Policy` keeps `interest-cohort=()` for scanners that look for
   it, though FLoC is withdrawn. Some Chromium builds log it as an unknown
   feature, so verify-headers lets that one exact message through and no
   other.
4. `'unsafe-inline'` stays in `script-src` and `style-src` while the pages
   carry inline script, styles and style attributes. Issue #68 tracks moving
   them out and dropping it. `'unsafe-eval'` is never allowed.
5. The `_headers` parser, path matcher and CSP rules live in
   `tools/lib/netlify.mjs` with unit tests. A bug there would not fail
   verify-headers; it would make it pass against headers nobody serves.
6. `parseHeaders()` splits each line on the first colon only, because values,
   the CSP above all, hold more colons.
7. `matches()` reads `*` as any run of characters and escapes every other
   regex character, so `/*.png` cannot match `/iconXpng`.
8. `headersFor()` applies every matching rule in order; a later rule
   overwrites an earlier one's value for the same header.
9. `cspFaults()` checks the values of `default-src`, `base-uri`,
   `form-action`, `object-src` and `frame-ancestors`, not only that they are
   there, because a weakened directive still looks like a policy.
10. `POLICY` in `tools/verify-headers.mjs` states what each header must mean
    (for example `X-Frame-Options` DENY or SAMEORIGIN, HSTS `max-age` of at
    least a year, a CSP with no `cspFaults`) rather than matching exact
    strings, so `_headers` stays the one place the policy is written.
11. verify-headers serves every response with `headersFor()` over the real
    `_headers`, loads the page in Chromium and fails on any CSP refusal,
    console error or 4xx. It judges the headers on the response it fetched
    for `/`, so a rule that parses but never applies still fails.
12. Chromium does not raise CSP refusals as page errors, so verify-headers
    reads them from `Log.entryAdded` with source `security`.
13. verify-calculator serves the site with the same rules, so a CSP that
    blocks `js/budget-calculator.js` fails there too.
