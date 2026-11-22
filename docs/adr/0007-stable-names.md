# 0007. Stable names, versions and anchors

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Links, checks, saves and caches find things by name. CLAUDE.md §9 sets the
rule: one stable name for each thing, never its position or wording.

## Decisions

### Caching

1. `/assets/*` is cached for a year as immutable, because each file there is
   named for its content hash. `assetHashDrift()` fails a file whose name
   does not carry the first 8 hex digits of its own sha256, so an edited
   file must take a new name. (CLAUDE.md §1, §9)
2. The icons, `og-image.png` and the files in `/images` keep fixed names, so
   page links carry `?v=` with the same 8-digit hash. `stampVersions()` in
   `tools/lib/asset-version.mjs` writes it, run by `tools/stamp-versions.mjs`
   and by `build-images`; verify-content fails a stale one. All three read
   one list, `PAGES`. Never type a version. (CLAUDE.md §9)
3. Root PNGs are cached for a week, not a year, because some requests for
   them come without `?v=` (the JSON-LD logo, crawlers).
4. `REF` in `asset-version.mjs` matches four forms: `href=` and `src=` root
   paths, absolute `content="https://schoolstack.ai/..."` for `og:image`, and
   the manifest's `"src":`. Narrowing it would leave the manifest icons or
   the share card unstamped.
5. `build-images` still writes `/favicon.png` (180px, rounded) though no page
   links it, because some crawlers and older clients ask for it by name.
6. `relativeFileRefs()` fails a page-relative `src`, `srcset` or `poster`:
   the file would have two URLs, and markup moved to another page would load
   nothing. (CLAUDE.md §9)
7. `js/budget-calculator.js` lives outside `/assets/`, so it is not under the
   year-long cache and needs no hash in its name.
8. The sitemap carries no `<lastmod>`, and verify-content fails one. With no
   build step it is typed by hand, and it went stale within days.
   (CLAUDE.md §9)

### Anchors

9. The early list band is `#early-access`. `#design-partners` (on an
   `.anchor-alias` just above the band), `#apply` and `#signup` stay so links
   already shared still land, but nothing on the site may link to them.
   `RETIRED_ANCHORS` in `tools/lib/page-audit.mjs` maps each to the id to use,
   and verify-render requires them on the home page. (CLAUDE.md §9)
10. `id="signup"` on the form box was the page's anchor until September 2026.
    It stays for shared `/#signup` links, and it carries `data-state`.
11. `#apply-heading` and `#signup` get their own `scroll-margin-top`, so a
    link to them does not land under the fixed nav. `#signup` sits one
    element lower, so it takes `--sp-9` plus `--sp-7` to keep the heading
    above it in view.
12. `danglingAnchors()` reads targets off the links themselves, so a link to
    an id nobody wrote fails rather than scrolling nowhere. It ignores a bare
    `#`, which verify-render already fails as a dead link; with `home: true`
    it collects the `/#id` links other pages make to the home page.
13. Each FAQ item has an id, and its JSON-LD question carries the same one as
    `@id` (`https://schoolstack.ai/#<id>`). `faqDrift()` pairs them by id, not
    position, so a reorder passes and a real difference names its question.
    Google drops FAQ markup that does not match the visible copy, without a
    word. (CLAUDE.md §9)
14. `js/site.js` opens the FAQ `<details>` whose id is in the URL hash, on
    load and on `hashchange`. Browsers scroll to a closed `<details>` but
    leave it shut, so `/#faq-cost` would land on a question with no answer.
15. `unsafeBlankLinks()` fails a `target="_blank"` link without
    `rel="noopener"`. Browsers now imply it; the rule keeps every outbound
    link the same, so one that differs does not distract review.

### Finding parts

16. `mount()` in `js/budget-calculator.js` finds every part by `data-calc`,
    never by class, so `index.html` owns layout and copy and a class renamed
    for looks breaks nothing. `mountBreakEven()` uses `data-be` and writes to
    `data-out` names that start `be-`, so its parts cannot be taken for the
    snapshot's. (CLAUDE.md §9)
17. `checkBar()` in `tools/verify-calculator.mjs` finds the bar segments by
    `data-calc` and asserts there are exactly 4, so a selector that matches
    nothing fails rather than passing an empty loop.
18. verify-content finds the FAQ by `id="faq"`, not its classes.
19. verify-render requires `#nav-menu` on every page, because `js/site.js`
    finds the phone menu by that id.

### Saved data

20. Enrollment Audit stores grades by id (`prek`, `k-2`, `3-5`, `6-8`,
    `9-12`), never by label, so labels can be reworded. `clean()` reads older
    saves through `OLD_GRADE_LABELS`, frozen at the labels used before
    November 2026; do not edit it when a label changes. (CLAUDE.md §9)
21. `KEY` (`ss-enrollment-path-v2`) and `FILE_TOOL`
    (`schoolstack-enrollment-path`) in `js/enrollment-audit.js` keep the
    tool's first name. Renaming either loses every saved audit.
    (CLAUDE.md §7)
22. The saved file written out by hand in
    `tools/lib/enrollment-audit.test.mjs` is frozen. Visitors keep these
    files, so if a change fails that test, change the tool, never the file.
    (CLAUDE.md §3)
