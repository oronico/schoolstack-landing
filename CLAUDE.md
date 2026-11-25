# CLAUDE.md — agent contract for schoolstack-landing

This repo is the marketing site at **https://schoolstack.ai**. It is four
static pages, `index.html`, `about.html`, `privacy.html` and `terms.html`
(served at `/about`, `/privacy`, `/terms`), sharing one
stylesheet (`css/site.css`), one small script (`js/site.js`) and the assets,
published by Netlify straight from the repo root. There is no build step: what
is committed is what ships.

There is no templating either, so the nav and footer are written out on each
page. `chromeDrift()` in `tools/lib/page-audit.mjs` fails `verify-content` if
the copies differ in anything but the intended two ways (`#faq` on the home
page is `/#faq` elsewhere; each page marks its own nav item `aria-current`).
Change both, or the check stops you.

**Tool pages** are the exception. `enrollment/index.html` (served at
`/enrollment/`) is Enrollment Audit, a stand-alone tool with its own masthead,
like Space and Budget, and its own stylesheet, `css/enrollment.css`. It does
not share the nav and footer, but it meets every other rule: self-hosted
brand faces through `--font-display` and `--font-body`, no outside origins,
`/go/` routes for tool links, the planning-only disclaimer, and the content,
render and accessibility checks (`TOOL_PAGES` in `verify-content`).

Read this before changing anything. Every rule below exists because it was
broken once and cost a round trip.

## 1. Brand, and the two things not to touch

**Quicksand (headings) and Inter (body copy) are the SchoolStack brand
faces**, the same as Space's `shared/design-tokens.json`. The logo's lettering
is **Montserrat ExtraBold**, outlined in the SVG files, so no page loads it
(owner, November 2026; this site used Nunito for body copy until then, and
was the only one that did). They are shared with Space, Budget, Access and
Lending Lab. Do not substitute them, do not "modernise" them, do not swap them
because a specimen looks better in isolation. They are set once, in `:root`:

```css
--font-display: 'Quicksand', ...;
--font-body: 'Inter', ...;
```

They are **self-hosted** in `fonts/`, not linked from Google. That is
deliberate: it removes a third party from every visitor's request path, it is
why the CSP can forbid all external origins, and it stops the render sandbox
failing silently. Regenerate with `node tools/fetch-fonts.mjs`, which fetches
a weight RANGE so each family is one variable file per subset rather than one
file per weight.

**The mark is three stacked bars on an off-white ground** (`#FAF9F7`),
left-aligned, tight gaps, filling ~80% of the box. That geometry is copied
from Budget's favicon so the products read as one family — the numbers live in
`tools/build-images.mjs` and should stay in sync with Space and Budget rather
than drifting to look good alone. SchoolStack is the parent brand, so it
carries all three founding hues where the product marks each use one.

**The wordmark is owner-supplied artwork.** It lives as outlined paths in
`assets/logos/schoolstack-logo.<hash>.svg` with a white-on-navy twin for the
footer, so the site loads no font for it. Its bars are tighter and longer than
the icon geometry above; the icons keep the family geometry until the owner
says otherwise. `_headers` caches `/assets/*` for a year as immutable, so a
changed logo takes a new hash in its name. A same-name swap leaves returning
visitors on the old file.

The horizontal logo shows at one size, `--logo-h` (32px tall, 203px wide),
in the nav, the footer and Enrollment Audit's masthead: the design kit's
minimum is 200px wide. Only the nav may narrow it, on screens under 360px,
where it and the menu button do not both fit.

**The product logos are the kit's lockups** (November 2026): the wordmark in
navy, the product name under it in the product's dark shade, bars in its
three shades (`products` in Space's `shared/design-tokens.json`). Space and
Budget come from their repos. Access had no SVG, so "Access" was outlined
from the kit's Montserrat ExtraBold at 100 units, ink top-left at (400, 197),
with kerning: the method that rebuilds Space and Budget pixel for pixel. If
Access's repo gains its own file, use that instead.

## 2. Voice: asset-based, never deficit-framed

The reader is a capable founder running a real business. Write to their
strengths, not their gaps.

**Do not ship copy that makes the reader the problem.** Avoid "can't",
"cannot", and double negatives in any headline, tagline, or CTA. "The back
office your school can't afford to hire" is retired: it is deficit-framed and
sits at the bottom of the value pyramid.

Positioning is anchored on Bain's **Elements of Value** (the consumer
pyramid: 30 elements across Functional, Emotional, Life changing, Social
impact). Not the B2B pyramid - our buyer is one founder making a personal
decision, not a procurement committee.

Name the value received, and name the element, using Bain's exact wording:

- **Short line / merch / sign-off:** `Stay ready.`
  Reduces anxiety (Emotional) + Reduces risk (Functional).
- **Campaign line:** `Know your numbers. Show your numbers.`
  Informs (Functional) resolving into Badge value (Emotional). "Know" is
  the private value, "show" is the public one - it climbs a tier in four
  words.
- **Positioning line:** `The back office small schools run on.`
  Organizes + Integrates, both Functional. Honest but bottom-tier; a
  replacement that reaches Emotional or Life changing would be stronger.

The base tier has to be real before anything above it lands, and ours is:
Organizes, Simplifies, Informs, Saves time, Reduces risk. What is unclaimed
is the top: **Provides hope** and **Self-actualization** (Life changing) and
**Self-transcendence** (Social impact) are all genuinely available to a
501(c)(3) whose customers are schools that serve children. Bain's finding is
that products delivering more elements, and higher ones, earn more loyalty -
so leaving the top three tiers empty is the real gap, not the wording.

State the value delivered, never the customer's shortfall. Two framings are
both out: "can't afford" names what they lack, and "deserves" names what they
are owed. Neither is a value received.

### Which pyramid depends on who is reading

Bain publishes two frameworks and SchoolStack needs both, because it speaks
to two audiences with different buying logic. Match the framework to the
reader rather than picking one house-wide.

**Founders (the consumer pyramid).** One person deciding, personally and
emotionally. Nobody signs off. Win them on the top tiers: Provides hope,
Self-actualization, Affiliation and belonging, Reduces anxiety. On this
pyramid the element for "walks into the lender meeting already holding the
answer" is **Badge value** - "reputational assurance" does not exist here and
should not be written into founder-facing copy.

**Banks, funders and accrediting partners (the B2B pyramid).** Committees,
mandates and downside risk. Lead with Risk reduction, Reputational assurance,
Stability and Expertise.

The part worth being deliberate about: for a lender our value is not only that
the founder looks prepared. **A SchoolStack-equipped school is a better
borrower** - cleaner books, faster underwriting, fewer surprises after close.
That is value delivered to the bank, not just to the school, and it is a
different sentence than the one that wins a founder.

Follow that through and the strategic prize is the third position: if lenders
and accreditors come to expect SchoolStack-shaped books, SchoolStack stops
being a tool a founder chose and becomes the format the sector reads. Copy
aimed at partners should be written with that end in view.

Practically: the landing hero, the tools grid and the signup form are founder
surfaces. The partner and funder sections are not - do not reuse founder lines
there, and do not water down the founder lines to make them serve both.

**Less copy** (owner, November 2026: "So MUCH copy, all over the site").
Say a thing once. A tool card is a logo, one line and a link; a band is a
label, a heading and what it shows, not a paragraph that repeats them. In
that pass the home page went from 1,364 words to about 1,100 and the tool
cards from 185 words to 72. Before adding a sentence, check whether the
heading, a button or another band already says it.

Other standing rules: no fake user counts, no em dashes in generated copy, and
`Estimates are for planning only and are not loan eligibility` stays wherever
numbers appear.

**These rules are now code.** `tools/lib/copy-rules.mjs` enforces them and
`npm run verify:content` runs it, because until then they bound only whoever
remembered to read this file — and they did not hold: "The back office
platform your school deserves." reached production through two green runs.

`deserves` is a ratchet rather than a hard failure. `KNOWN_DEBT.entitlement`
records how many lines carry it, every run prints them, and the check fails
when the count **rises**.

The count was taken to 0, restored to 8 at the owner's instruction, and
brought to 1 by the September 2026 homepage redesign, whose hero headline the
owner specified. **So this section and the live page still disagree on one
line** - section 2 above retires the word, the page uses it once. Settling
that is the owner's call, and until they do, the check tracks the page rather
than the preference. It still catches a second instance nobody meant to add.

| Surface | Reads |
| --- | --- |
| `<h1>` | The back office small schools deserve. Built with the people who run them. |
| Platform film, spoken and in its captions (`assets/video/*.vtt`) | This is the back office small schools deserve. |

The film's line is the owner's own narration, and captions must match what
is said, so the captions file carries it. The ratchet reads the pages, not
the captions, so it does not count this line; keep the narration's words out
of page text unless the owner settles the word.

## 3. Checks — run these, they have each caught a real bug

```
npm test                        # everything below, in order, plus the feature suite
node tools/verify-content.mjs   # files: redirects, structured data, voice rules, anchors, fonts, comments
node tools/verify-render.mjs    # layout: stretched images, heading order, overflow, dead CTAs
node tools/verify-headers.mjs   # the CSP does not block the page it protects
node tools/verify-calculator.mjs # the durability snapshot, driven by keyboard and typing
node tools/verify-a11y.mjs      # contrast, landmarks, skip link, labels, on both pages
node tools/verify-form.mjs      # the early list form, all four submit outcomes
node tools/build-images.mjs     # regenerates icons + OG card, asserts the fonts loaded
npx cucumber-js                 # the same checks, read as specifications
```

Cucumber and acorn are the repo's **only** dependencies, and both are
devDependencies: neither reaches a browser, so the CSP goes on forbidding
every external origin and the site still ships as one static file. Acorn
(owner, November 2026) parses JavaScript for the comment check, because a
hand-written scanner kept missing cases (ADR 0001). `node_modules/` is gitignored
because Netlify publishes from the repo root — anything committed there is
served.

The feature files under `features/` are a readable front door, not a second
suite. Their steps import the same modules under `tools/lib/` that the scripts
import, so nothing is asserted by two implementations that could drift. When
you add a check, put the logic in `tools/lib/`, call it from the script, and
add the step only if the rule is worth stating in English.

Why each exists:

- **verify-render** — `width`/`height` attributes were added to stop layout
  shift without the matching `height: auto`, which welded the dashboard image
  to 768px tall and squashed it. A source-level check that only looked for the
  attributes passed happily. This one compares each image's *rendered* aspect
  ratio to its natural one, and cross-checks every `/go/` link against
  `_redirects` so a typo cannot become a dead CTA on a live page. It checks
  image shapes again with the page's text at 150%, as a visitor who raises
  the browser's font size sees it: the tool logos squashed there after #49
  while the normal-size pass stayed green. It renders
  `/` and `/about`, fails if retired words ("Lending Lab", "four tools")
  reach a reader, and fails if a nav link lands its heading under the fixed
  nav.
- **verify-calculator** — the durability snapshot's math lives in
  `js/budget-calculator.js`, the one file the page, the unit tests and the
  feature steps all load. A blocked or missing script leaves the
  server-rendered defaults on screen, which look right and never move, so
  this check drives the real page: typing, slider keys, labels that match
  the chart, past 100%, reset, tap targets. It is called a snapshot, not a
  budget, on purpose: Budget is where the five-year plan is built, and the
  CTA under it says so. Wording changes must not move a number: compare
  `calculate()` against `main` over a grid of inputs before merging. The
  same file carries the **break-even card** beside it (owner request,
  November 2026): total yearly expenses including debt service, divided by
  tuition or per-pupil funding per student, rounded UP to a whole student.
  One-time purchases stay out, the same basis SchoolStack Budget uses for
  break-even. Its arithmetic is unit tested in
  `tools/lib/break-even.test.mjs`, stated in `features/break-even.feature`,
  and driven in the browser by the same verify-calculator run.
- **the focus ring** — `verify-a11y` presses Tab through every page at both
  widths and fails any stop whose focus ring is missing or under 3:1 against
  what it is drawn over (`tools/lib/focus-audit.mjs`). It only measured text
  until November 2026, when the consent checkbox's ring turned out to be ink
  on the ink band and Enrollment Audit's masthead ring 2.64:1. A control that
  hides itself and rings the label beside it is judged by that label's ring,
  and an inset ring by the fill it sits on: Codex found the first version
  passing Enrollment Audit's answer buttons, whose rings were 1.2:1 on red.
  It runs in the light theme only. It cannot reach a state that needs a
  submit, so the thank-you panel was checked by hand.
- **touch targets** — on a touch screen Enrollment Audit's controls are
  44px tall and its fields use 16px text, from one `(pointer: coarse)`
  block (#52). Nothing checked it until November 2026, so `verify-a11y`
  now opens the page at 390px as a touch screen and fails any control
  under 44px or field under 16px (`tools/lib/touch-audit.mjs`). It first
  asks the browser whether it reports a touch screen and fails if not, so
  a broken emulation cannot pass. With the block removed it fails 171
  controls. The calculator's own tap targets are checked by
  `verify-calculator`.
- **Enrollment Audit's math** lives in `js/enrollment-audit.js`, loaded by
  the page and by `tools/lib/enrollment-audit.test.mjs`, the same pattern
  as the calculator. Before it moved there (November 2026) six PRs in two
  days changed its scoring and seat math with nothing to test them, and
  review caught two bugs a unit test would have (`d24464c`, `9922c4e`). The
  page's own script only draws and saves. A change to scoring, the plan,
  the seat math or saved files goes in that file with a test beside it.
  One test opens a saved file written out by hand; never edit it to make
  a change pass, because visitors keep those files.
- **working lines** — `tools/lib/working-lines.test.mjs` reads back every
  sum the calculators print ("$10,000.50 × 50 students", "$600,000 ÷ $10,000
  per student") and fails if it does not reproduce the printed answer. The
  same mistake shipped twice: the math in cents, the working line rounded to
  the dollar (#32, then #31).
- **no comments** (owner, November 2026) — code carries no comments.
  `verify-content` finds them with `tools/lib/comments.mjs`. Why the code is
  the way it is goes in `docs/adr/`, one ADR per topic; a known shortcut
  goes in an issue. `COMMENT_DEBT` is a ratchet like `KNOWN_DEBT`: it
  records the comments each file may still carry, and fails when a count
  moves without it. `/delete-comment` sorts and clears what is left. The
  676 comments of 22 November 2026 were 455 decisions, 195 repeats of the
  code, 21 stale and 12 excuses (ADR 0001).
- **verify-headers** — a CSP is applied at the Netlify edge, so neither local
  development nor the diff will tell you it blocked your own stylesheet.
- **build-images** — the OG card once shipped in DejaVu Sans because the
  render sandbox could not reach Google Fonts and the failure was silent. The
  build now asserts the expected families actually loaded and exits non-zero.
- **verify-content** — the file-level rules no browser can see: a 301 where a
  302 is load-bearing, JSON-LD that has drifted from the visible FAQ, and now
  the voice rules from section 2 above. It also derives anchors from the links
  rather than checking a hardcoded list, so a nav item pointing at an id
  nobody wrote fails instead of silently scrolling nowhere.
- **the font pair** — `verify-content` checks the families `:root` asks for
  against the `@font-face` families `fonts/fonts.css` serves; `verify-render`
  then asks the browser which face it actually painted. Both halves are needed.
  A name drift between those two files loads every file with a 200 and paints
  the whole site in Trebuchet MS, which is the page-wide version of the DejaVu
  Sans incident above. Note that `document.fonts.check()` cannot answer this:
  it reports whether text *could* be painted, and a fallback always can, so it
  returns true for a family that does not exist. The check compares the loaded
  face set and canvas metrics instead.

## 4. Layout: one measure

Every full-width band aligns to `--container` with `--gutter` inside it, so
content edges line up from nav to footer. Deliberately narrow centred blocks
use `--measure`. The nav keeps a full-bleed background but constrains its
contents with

```css
padding-inline: max(var(--gutter), calc((100% - var(--container)) / 2 + var(--gutter)));
```

which resolves to `.section`'s left edge at every width, no wrapper needed.
`--gutter` is redefined once inside the 640px query; do not hardcode a mobile
gutter on individual bands, which is how the page previously ended up with
three different left edges going down a phone screen.

A band that wants the reading measure instead of the full container takes
`.section-narrow` alongside `.section`, so the heading moves in with the
content. Do not cap a block inside a container-width band instead: the founder
quote and the FAQ cards each carried their own `max-width: 760px`, which left
them hanging 256px short of the right edge while the heading above them sat on
the container edge, and gave the page a ragged right margin. There are two
measures and no others.

### Three scales, and nothing off them (November 2026)

`css/site.css` was rebuilt on three scales, defined once in `:root`. Every
margin, padding, gap, font size and colour in it is one of these:

- **Spacing:** `--sp-1` to `--sp-9`, on a 4px base (4, 8, 12, 16, 24, 32,
  48, 72, 96px). Tailwind's pattern: one base, fixed multiples.
- **Type:** `--step--1` to `--step-4`, six steps, each a `clamp()` from a
  390px to a 1440px screen (Utopia's method). `--step--1` is held at 15px:
  before the rebuild, 44% of the home page's characters were smaller. The
  hero `<h1>` is the only `--step-4` text; band headings are `--step-3`.
- **Colour:** five tokens, each with one job. `--ink` text and the dark
  bands, `#1E293B`: the navy of the wordmark, the product logos, the
  design kit and all three apps (owner, November 2026; it was `#141E33`,
  which matched nothing else); `--paper` the page (the mark's own `#FAF9F7`) and text on ink;
  `--muted` secondary text on paper only (2.6:1 on ink fails); `--accent`
  the one primary action, and the "tight" status; `--alert` errors and
  "over 100%". `--line` and `--line-on-ink` mix two tokens for hairlines
  and are never painted behind text, because the contrast check cannot
  read a mixed colour.

The home page alternates its ground to break up the scroll (order set by
the owner, November 2026): the paper hero, free tools and platform film,
the ink early list band, the paper calculator, the ink Enrollment Audit
band, paper again, the ink footer. The free tools sit directly under the
hero, because visitors had to scroll 3.6 screens to reach them. Ink is the only other ground the five tokens
allow, and two ink bands never touch.

**One primary button.** Every "Sign up for early access" (hero, early list form,
the footer of every page) is `.btn-primary`: accent ground, ink text. On
the ink bands its hover turns paper instead of ink, which would vanish into
the ground (owner, November 2026: "One style"; it was three).

No gradients and no drop shadows. The one exception is the slider track,
whose filled part is a hard stop between two flat colours: WebKit has no
other way to colour it. Each product's own colour lives in its logo
artwork, so the tool cards carry none. Enrollment Audit keeps its own
styles: its five stage colours and answer colours carry meaning.

## 5. Netlify specifics

- `_headers` carries the CSP and cache rules. It allows **no external origin** —
  adding any third-party script (analytics, embeds, fonts) means editing it,
  and then re-running `verify-headers.mjs`.
- `_redirects` canonicalises `www` → apex, and routes tool CTAs through
  `/go/*`. Those are **302 on purpose**: a 301 is browser-cached, so only the
  first click per person would ever reach the CDN and the counts would
  silently undercount. Netlify Analytics reads CDN request logs, which is the
  only reason outbound clicks are countable at all.
- `/go/lending-lab` and `/go/screener` stay in `_redirects` although nothing
  on the site links them: Lending Lab is off the public site for now, and
  links already shared must keep working. `verify-render` names them as the
  only rules allowed to have no CTA.
- `/about` is rewritten to `about.html` (Netlify would serve it anyway; the
  rule states it). The local harness does the same.
- `robots.txt` disallows `/go/` and nothing else. It used to list the repo's
  own folders, which only asked polite crawlers to look away and told
  everyone else where to look.
- **The repo's own files are not served** (November 2026). Netlify publishes
  the repo root, so `CLAUDE.md`, `CHANGELOG.md`, `docs/`, `tools/` and the
  rest answered 200 to anyone. `_redirects` forces each to `404.html` with
  `404!`. A new top-level file that is not a page or an asset needs a line
  there too.
- `llms.txt` describes the site for AI tools, in the llmstxt.org format
  (November 2026). It is markdown, so the comment check skips it. It links
  the tools by their own domains, never `/go/`, so a crawler does not
  count as a click. Keep its facts in step with section 7.
- The lead form is Netlify Forms (`name="early-access"`). It is the early
  list for early access and product updates (owner, November 2026: it was the
  design partner application from September to November). The name stays, because a
  rename creates a second form in the dashboard and orphans the first one's
  notifications. Netlify reads the field list off the deployed HTML, so a new
  `<input name>` becomes a stored column on the next deploy with no other
  change. Submissions live in the Netlify dashboard. **Do not add a third-party form handler** without
  talking to the owner: the list is a company asset and it stays first-party.
- **One sign-up** (owner, November 2026): the early list. The footer of
  every page keeps the sign-off line "Stay ready." with a link to it, not a
  form of its own. The footer's `mailing-list` form was retired that month;
  addresses it collected stay in the Netlify dashboard, and `privacy.html`
  still covers them. Do not add a second sign-up form. Netlify only
  collects the addresses; whatever tool sends the emails gets them by export
  from the dashboard, and `privacy.html` must name that tool before it holds
  the list.

## 6. Working agreements

- Small draft PRs, one open at a time. The owner marks ready and squash-merges.
- Never invent a product screenshot. A fabricated dashboard image shipped once
  and had to be pulled: it contained hex codes as card titles and gibberish
  table rows. If there is no real screenshot, ship no screenshot.
- Social/profile URLs cannot be verified from the build sandbox. When adding
  one, say so and ask for a click-through check before merge.
- Do not write an unfamiliar feature from scratch (owner, November 2026).
  First search GitHub for open-source projects that solve it, compare two
  or three of their approaches, and say in the PR which one you follow and
  why. Cucumber and acorn are the only dependencies (section 3), so most
  often you borrow the pattern, not the package; adding a package needs the
  owner.
- Build only what was asked (owner, November 2026). Anything extra goes in
  the PR description as a proposal, not in the code, and do not design for
  rare or future cases nobody asked about. Agents broke this three times in
  three months: copy nobody asked for (taken out in #23), `aria-busy` on the
  application form and state attributes on Enrollment Audit (both taken
  back out in November).
- **Two review bots read every PR: Codex and Cursor Bugbot. A PR is not
  ready until both have reviewed its latest commit and each finding is fixed
  or answered on its thread.** They skip drafts and start when a PR is
  marked ready; Bugbot takes about 10 minutes and comments only when it finds
  something. Between 4 and 17 November 2026 every PR was merged within
  seconds of being marked ready, so five Bugbot findings landed after the
  merge and nobody read them; three were live bugs (#31, #35, #39). So:
  when you open a draft, post one comment, `@codex review`, so Codex reviews
  the draft. When the owner marks a PR ready, keep watching it until Bugbot
  has had its 10 minutes, and report what both bots found, or that they
  found nothing, before the owner merges.

## 7. Product facts copy must not contradict (November 2026)

- **Three tools are promoted: Space, Budget, Access.** Lending Lab is not
  promoted on schoolstack.ai while it gets more work: no card, nav, footer,
  FAQ, metadata or share-card mention. Do not touch the Lending Lab app.
- **Enrollment Audit was called Enrollment Path until 21 November 2026**
  (owner). The page, the nav and the footers use the new name. The
  browser storage key (`ss-enrollment-path-v2`) and the saved-file tag
  (`schoolstack-enrollment-path`) keep the old one, so audits saved before
  the rename still open; do not change them (section 9).
- **Enrollment Audit is not a fourth product** (owner, November 2026). It is
  a self-audit of a school's recruitment and enrollment, reached from the
  main nav, the phone menu, the footer's Resources column, its own ink band on
  the home page after the calculator (with a real screenshot of the example
  audit's scorecard), and a link under the break-even result. It is not a tool
  card and not counted in "three tools". Never call it free. Its logo file
  (`assets/logos/schoolstack-enrollment-logo.svg`) is kept for later use.
- **Who it is for: schools of 20 to 250 students** (owner, November 2026).
  The hero, the early list and the FAQ say so. Space, Budget and Access stay
  open to any school, so the range never reads as a door shut.
- **The goal of the page is sign-ups for early access to the full
  product.** Early access is not open: a school can sign up for it, and
  nothing more yet (owner, November 2026: "Early access is not true. Sign
  up for early access is true."). "Sign up for early access" is the primary
  button in the hero, on the form and in every footer; the nav and footer
  links read "Sign up". Never "Get early access" or "early access open":
  `ACCESS_CLAIM` in `tools/lib/copy-rules.mjs` fails both, share text
  included. Words that are true stay ("Early access news", "Early access
  starts with schools on QuickBooks Online"). The free tools
  are the secondary action. The platform band names the jobs founders hire
  SchoolStack for, in the words they used in design partner calls and
  demos (payroll, who owes tuition, filling seats, the board). Add a job
  only if the product does it today.
- **Schools on another accounting platform** can move to QuickBooks Online
  with SchoolStack's accounting partner; they email allison@schoolstack.ai.
  Do not name the partner on the site until the owner says so.
- **QuickBooks Online is the accounting system of record.** Never present
  Advanced as required. The owner's guidance for nonprofits: review Advanced
  for the categorization Form 990 preparation needs. The FAQ says so.
- **The QBO integration rolls out with the design partner pilot** from
  November 2026 and opens more widely with the platform in 2027. Cash-basis
  schools go first and an accrual cohort follows, but **cash versus accrual
  is internal** (owner, November 2026): never put it on the site.
- **Design partner schools use the platform today, and it opens to more
  schools in 2027** (owner, November 2026). Say it that way. Do not write
  "closed beta" or "beta" on the site: the owner found it unwelcoming, and
  "early access" is the word. `verify-content` fails on the word (`BETA` in
  `tools/lib/copy-rules.mjs`), share text included. The platform band carries the owner's film
  (click to play, captions on by default, no autoplay), with the line
  "Shown: SchoolStack today, built with our design partner schools." Keep
  that line wherever the film appears. The film follows the free tools, and
  the early list band follows the film.
- **Space, Budget and Access are free, funded by philanthropy so more
  schools can flourish** (owner, November 2026). Say "free", not
  "complimentary" or "at no cost": it is the word founders search for (owner,
  24 November 2026). Name the three tools whenever you say so: a bare "free"
  reads as if the platform were free too, and its pricing is not settled. The tools band says it and
  thanks Stand Together Trust and the Beth and Ravenel Curry Foundation.
- **Gusto is a planned integration.** SchoolStack does not run payroll and
  does not replace QuickBooks or Gusto. Do not claim Gusto is live, name
  Gusto actions nobody has confirmed, or promise every platform capability
  ships at once. The platform is "in development for 2027".
- **The calculator's starting allocations are illustrations, not
  benchmarks.** No facilities ceiling, no staffing norm, and no message that
  reads a positive remainder as financial health. "Tuition and funding", not
  "tuition", because the input covers per-student funding too.
- **Contact:** every Allison contact link is `allison@schoolstack.ai`.
  Daniel's is `daniel@schoolharbor.com`. LinkedIn and other profile URLs need
  a human click-through before merge (section 6).
- **Who is who:** SchoolStack is a nonprofit venture incubated by Building
  Hope Impact Fund (counsel's words; see "Ownership and credit" below), not a
  separate legal or tax-exempt entity, so never put a 501(c)(3) badge next to
  the SchoolStack name alone. "A program of" stays only in the Terms and
  Privacy legal text. School Harbor is the technology development partner;
  Daniel leads development through it.
- **Ownership and credit (SchoolStack suite).** Every SchoolStack app uses
  the same ownership and credit words. The source is
  docs/brand/suite-language.md in the SchoolStack Space repo.
  - Credit, word for word, in every page footer: "SchoolStack
    is a nonprofit venture incubated by Building Hope Impact Fund. Founder &
    Product Developer: Allison Serafin" (the first sentence is counsel's
    wording, 2026-10-28). Add nothing to it. Copy that names the owner opens
    with the same first sentence.
  - A heading or label over the Building Hope logo reads "Incubated by".
  - Copyright: "© {year} Building Hope Impact Fund. All rights reserved."
    Never name "SchoolStack" as the copyright holder.
  - LICENSE: Building Hope Impact Fund owns the work and holds all rights;
    "Allison Serafin is credited as Founder & Product Developer; the credit
    grants her no license or other right in the repository."
  - Never write "incubated at", "a product of", "built by Allison Serafin",
    "designed and built by", or "Product design by".
  - The footer is copied into each page by hand, so
    `tools/lib/brand-credit.test.mjs` checks every page carries the credit
    and the copyright line, and that no old phrase comes back.
- **Enrollment Audit saves answers in the visitor's browser** (localStorage)
  and sends nothing. Its share-your-numbers block posts to an Airtable form
  and is off (`SHARE_ENABLED=false`). Turning it on needs the owner's
  approval (section 5: no third-party form handler without it) and a
  matching change to `privacy.html` and the tool's footer line.
- **The privacy policy is a list of facts about the code.** No cookies, no
  outside scripts, the calculator sends nothing, and each form's fields are
  listed one by one (`data-field`), under a list marked with that form's
  Netlify name (`data-form="early-access"`).
  `verify-content` fails if the form gains a field its list does not
  name, or if any page or script starts using cookies. `FORMS` in
  `tools/lib/page-audit.mjs` is the list of forms it checks. Change the site and `privacy.html` together, and have both
  legal pages reviewed by counsel before material changes ship.

## 8. UI state: one attribute per component

Each piece of the home page that changes as a visitor uses it keeps its state in
one place and names it on the page as an attribute. Read the attribute, not
a mix of `disabled`, `hidden` and text, to know where a component is; tests
and agents both do. When you add a state, add it to the table in the code
and to this list, and give the check that covers it a line.

| Component | Where | Attribute | States | Checked by |
| --- | --- | --- | --- | --- |
| Early list form | `js/signup.js` | `#signup[data-state]` | `idle` → `submitting` on SUBMIT; then `submitted` on SUCCEED or `failed` on FAIL; `failed` → `submitting` on SUBMIT | `verify-form`, `features/signup.feature` |
| Durability snapshot | `js/budget-calculator.js` | `.calc[data-status]`, `[data-stale]`, `[data-ready]` | `ok`, `tight`, `over`; stale while a field is invalid | `verify-calculator`, unit tests |
| Break-even card | `js/budget-calculator.js` | `[data-stale]`, `[data-ready]` | stale while a field is invalid | `verify-calculator`, `features/break-even.feature` |
| Phone menu | `js/site.js` | `#nav-menu[open]` | open, closed (the browser keeps it) | `verify-render` checks the id is on every page |

The early list form shows exactly what `VIEW[state]` says. `ON[state]`
lists the events each state answers (`SUBMIT`, `SUCCEED`, `FAIL`) and where
each leads; `send()` ignores any other, which is what stops a second Enter
keypress while a request is out.

The shape is borrowed, not invented (section 6). XState, Robot and
javascript-state-machine all key moves by event name; xstate/fsm ignores an
event the state does not list, where javascript-state-machine throws, and a
form should not throw on a double keypress. Radix names state with one
valued `data-state` attribute per concern and a bare attribute such as
`data-disabled` for the rest, which is what `data-state`, `data-stale` and
`data-ready` here follow. No library is loaded: a four-state form does not
earn a dependency.

The form, the error and the thank-you panel are shown and hidden with the
`hidden` attribute, so without the stylesheet the page still shows the right
one. The form does not carry `aria-busy`: MDN describes it for live regions,
widgets and feeds, not forms, and it would tell a screen reader to hold back
the button's "Submitting..." label, the one change a visitor should hear.

## 9. One name for each thing (November 2026)

Anything a link, a check, a save or a cache finds by name gets one stable
name, and never its position or its wording. Each rule below is checked.

- **The early list is `#early-access`**, the same as its Netlify form name.
  `#design-partners`, `#apply` and `#signup` stay on the page so links
  already shared still land, but nothing on the site may link to them
  (`RETIRED_ANCHORS` in `tools/lib/page-audit.mjs`; `verify-content`
  fails a link to one). Retire an id the same way: keep it, list it. A
  retired id with no element of its own goes on an empty `.anchor-alias`
  placed just before the section it stood for; `verify-render` fails one
  that lands more than 1px from the id that replaced it.
- **Each FAQ item has an id** (`faq-cost`, `faq-2027`, ...), and its JSON-LD
  question carries the same one as `@id`. `verify-content` pairs the two by
  id, so reordering questions is safe and a real difference names the
  question. `/#faq-cost` opens that answer (`js/site.js`).
- **Enrollment Audit stores grades by id** (`prek`, `k-2`, `3-5`, `6-8`,
  `9-12`), never by label, so a label can be reworded without losing a
  visitor's saved choice or hiding the practices filtered on it. Saves from
  before the change are read through `OLD_GRADE_LABELS`, frozen at the
  words they used; do not edit it when a label changes.
- **A file in `/assets` is named for its content hash** (first 8 hex digits
  of its sha256). `verify-content` fails a file with no hash or the wrong
  one, so an edited logo must take a new name (section 1).
- **The icons, the link-preview card and the images in `/images` keep
  fixed names** (browsers, social sites and other sites ask for them by
  name), so they carry `?v=` with the same 8-digit content hash. Run
  `node tools/stamp-versions.mjs` after replacing one (`build-images` runs
  it too; `tools/lib/asset-version.mjs`); never type one. `verify-content`
  fails a stale version and an `/images` link with none.
- **Local files are written from the site root** (`/images/x.png`), so each
  file has one URL. `verify-content` fails a page-relative `src`.
- **Scripts and checks find a part by id or `data-calc`, never by its style
  class**, so a class renamed for looks breaks nothing: the calculator's bar
  segments and CTA (`data-calc`, checked by `verify-calculator`) and the
  phone menu (`#nav-menu`, required on every page by `verify-render`).
- **The sitemap carries no `<lastmod>`.** Sitemap tools take it from git at
  build time; with no build step it is typed by hand, and it was 13 days
  stale when removed. `verify-content` fails one.
