# 0018. The year-end giving guide

Status: accepted. Recorded 22 November 2026, when `giving.html` was added
(owner request: a guide for schools, clean and quick for a busy leader).

## Context

`giving.html`, served at `/giving`, is a guide for school leaders: year-end
giving in one afternoon, built from the owner's guide doc. It shares the
nav and footer with the other pages and meets the same checks.

## Decisions

1. It is linked from the footer's About column on every page and listed in
   the sitemap, not from the top menu or the home page: it is seasonal, and
   the home page keeps to less copy (CLAUDE.md §2). People reach it from
   the link the owner shares.
2. The page is six timed steps, each a band with a hairline above it, so a
   reader on a phone always knows where a step ends. The steps at the top
   are jump links. Styles are the `.guide` rules in `css/site.css`, on the
   existing tokens (ADR 0008).
3. Prompts and templates sit in a `<pre>` with a Copy button. A button names
   the `<pre>` it copies by id (`data-copy`). The script in `js/site.js`
   follows GitHub's clipboard-copy-element: `navigator.clipboard.writeText`
   where the browser has it, a selection plus `execCommand('copy')` where it
   does not. The label reads "Copied" for two seconds, and a polite live
   region says so, because a screen reader does not announce a button's
   label changing. If both ways fail, the text stays selected and the button
   reads "Text selected", so the reader can copy it by hand.
   Each button keeps its own label timer and the live region one timer, and
   both restart on a new click, so a second copy shows its full two seconds.
   The live region is cleared and set again after 100 ms, so a screen reader
   announces a repeated copy too.
4. The guide's numbered lists (`.guide-list`) space their items with
   margins, not a grid, so each item keeps its list marker in every browser.
5. Two sets of facts on the page must stay true, with their sources linked
   beside them: the IRS rules in step 6 (a written acknowledgment for a gift
   of $250 or more, a disclosure for a quid pro quo payment over $75), and
   Gmail mail merge needing a paid Google Workspace plan, with its daily
   limits, in step 5.
6. Every send date on the page is a Tuesday in December 2026. Check the
   dates and weekdays before the page is reused for another year.
7. The page has its own link-preview card, `og-giving.png`, built by
   `build-images` from `tools/og-giving.html` in the site card's design
   (ADR 0015).
