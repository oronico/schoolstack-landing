# 0018. The year-end giving guide

Status: accepted. Recorded 22 November 2026, when `giving.html` was added
(owner request: a guide for schools, clean and quick for a busy leader).

## Context

`giving.html`, served at `/giving`, is a guide for school leaders: year-end
giving in one afternoon, built from the owner's guide doc. It shares the
nav and footer with the other pages and meets the same checks.

## Decisions

1. It is linked from the footer's Resources column on every page and listed in
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
8. The hero names the worry that stops founders, that asking for money
   feels awkward, before it offers the plan (owner review, November 2026,
   against jobs-to-be-done and demand-side selling).
9. A "Starting after December 1?" note sits under the send dates, because
   partners keep forwarding the page after Giving Tuesday.
10. Step 2 links to SchoolStack Budget through `/go/budget`, for a founder
    who has no cost-per-student figure; the whole ask ladder rests on it.
11. Step 2 names no donation tool. Their pricing changes and several are
    paid by a tip asked of the donor, so the page tells schools what to
    check instead: the cost of each gift, and whether donors see a tip
    request.
12. Step 4 ends with an offer from the owner to read a school's draft
    letter, so a reader can turn into a conversation.
13. Step 2 lists what gifts can fund (owner, November 2026: scholarships,
    supplies, field trips, gas cards, operating costs, special programs)
    and notes that a gift given for a named use must be spent on it.
14. Step 4 teaches a three-part story (before, what changed, what a gift
    makes possible next) with a made-up example, labeled as made-up. The
    page carries no real school's story until a school agrees to share one.
15. "Pass it on" is a `mailto:` link with the subject and the page's URL
    filled in and no address, so a reader forwards it in one tap and the
    page sends nothing itself.
16. The guide prints as a branded document, because schools print it and
    pass it to a board member or a colleague (owner, November 2026:
    "branded and polished for a high end professional brand"). It is
    scoped to `body.guide-page`, because the stylesheet is shared and other
    pages print in full. In print:
    - a named page (`@page guide`) on US Letter, with the guide's name, its
      address and "page X of Y" in the bottom margin of every page;
    - the logo heads page 1 over a navy rule, with the guide's address
      where the nav links were;
    - each step starts on its own page, so a reader can hand out one step;
    - cards sit two across and no card, prompt, callout or table breaks
      across pages;
    - each outside link prints its address beside it (`data-print` on the
      link, a short form chosen by hand), so the page works on paper;
    - `js/site.js` opens every closed `<details>` before printing and
      closes them after, so the example letter prints;
    - the copy buttons, the share band and the footer's sign-up line drop
      out; the closing band keeps its line and adds the address to visit;
      the credit and copyright stay, word for word, on the last page.
    The guide prints on 10 pages. A prompt that does not fit beside its
    step takes the next page whole rather than splitting.
17. The page carries Article JSON-LD for search. Its `image` has no `?v=`,
    because `stamp-versions` stamps attributes, not JSON.
