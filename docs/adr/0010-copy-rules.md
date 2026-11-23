# 0010. Copy rules in code

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

CLAUDE.md §2 and §7 set the voice and the product facts copy must not
contradict. `tools/lib/copy-rules.mjs` holds the voice rules as pure
functions over HTML, shared by verify-content, the unit tests and the
Cucumber steps. Faults fail hard; "deserves" is debt that fails only when its
count rises. (CLAUDE.md §2, §3)

## Decisions

### What counts as copy

1. `stripNonCopy()` blanks comments, scripts and styles, so a class name or
   code comment cannot trip a voice rule. It keeps the `ld+json` script,
   because its FAQ answers are copy a reader sees; stripping every script
   once hid a "deserves".
2. It replaces each region with that region's newlines only, so the line
   numbers `locate()` reports still point at the page. Removing regions
   outright once moved the `h1` hundreds of lines early in reports.
3. `RETIRED` in `tools/verify-render.mjs` (Lending Lab, four tools, all four,
   check your fit) is matched against the rendered text, not the source, so
   only what a visitor reads fails. (CLAUDE.md §3)

### The rules

4. `DEFICIT_WORDS` (can't, cannot, couldn't, won't afford, unable to)
   applies to `h1` to `h3`, CTAs and share metadata (title, description,
   `og:`, `twitter:`), because `og:title` is the headline a link preview
   shows. Body copy may need a negative, so it is exempt. The rule exists to
   keep "The back office your school can't afford to hire" from coming
   back. (CLAUDE.md §2)
5. `ENTITLEMENT_WORDS` matches deserve, deserves and deserved: the word
   names what the reader is owed, not the value received. (CLAUDE.md §2)
6. `BETA` fails "beta" anywhere in page copy, the head and share text
   included. The word is "early access". (CLAUDE.md §7)
   `ACCESS_CLAIM` fails "Get early access" and "early access (now) open"
   the same way: early access is not open yet, and the true offer is "Sign
   up for early access" (owner, November 2026). (CLAUDE.md §7)
7. `USER_COUNT` fires only on adoption verbs (join, trusted by, used by,
   loved by, serving) before a number. An earlier version also fired on
   "over" and "more than", and failed the true founder quote "we met over
   100 school founders".
8. `DISCLAIMER` matches only "are for planning only and are not loan
   eligibility", on whitespace-collapsed HTML, because pages word the start
   differently and the footer wraps the sentence.

### The ratchet

9. `KNOWN_DEBT.entitlement` is 1: the hero `h1` the owner set in the
   September 2026 redesign. CLAUDE.md retires the word, so the page and the
   rule disagree on that line until the owner settles it. Lower the number
   when the copy improves; never raise it to get green. When the debt test
   fails low, the copy improved. (CLAUDE.md §2)
10. Every page other than `index.html` has a "deserves" allowance of zero,
    so a first instance there fails rather than hiding under the home
    page's count.
11. verify-content and the ratchet step print every remaining "deserves"
    line on every run, pass or fail, so the debt stays in view.

### Brand credit

12. `tools/lib/brand-credit.test.mjs` checks every page carries the suite
    credit and copyright line word for word (source:
    `docs/brand/suite-language.md` in the Space repo) and that retired
    phrases stay gone. It collapses whitespace first, because pages wrap the
    credit across lines. (CLAUDE.md §7)
13. "A program of Building Hope" is allowed only on `privacy.html` and
    `terms.html`, the legal text counsel owns. (CLAUDE.md §7)

### Page copy

14. `og:title` and `twitter:title` differ from the SEO `<title>` on purpose:
    they are written for a person reading a link preview, not for search
    results. Do not sync them.
15. The `.platform-jobs` list uses the words founders used in design partner
    calls. Each must be something the film shows today. (CLAUDE.md §7)
16. The platform band says the platform is in development for 2027 and that
    design partner schools use it today. QuickBooks Online is the system of
    record and Advanced is not required. SchoolStack does not run payroll,
    and Gusto is only planned. (CLAUDE.md §7)
17. The Enrollment Audit band is a self-audit, not a fourth tool. It sits
    apart from the tool cards, is never called free, links in the same tab,
    and shows the real tool's scorecard for the example school.
    (CLAUDE.md §7)
18. The founder intro on the home page stays brief; full biographies and
    values live on `/about`. (CLAUDE.md §2)
19. The About page is text-led on purpose: no approved headshots exist, and
    the site never ships invented images. Add photos only when the owner
    supplies them. Its copy is owner-approved (November 2026). (CLAUDE.md §6)
