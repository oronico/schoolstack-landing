# CLAUDE.md — agent contract for schoolstack-landing

This repo is the marketing site at **https://schoolstack.ai**. It is a single
static `index.html` plus assets, published by Netlify straight from the repo
root. There is no build step: what is committed is what ships.

Read this before changing anything. Every rule below exists because it was
broken once and cost a round trip.

## 1. Brand, and the two things not to touch

**Quicksand (headings) and Nunito (body) are the SchoolStack brand faces.**
They are shared with Space, Budget, Access and Lending Lab. Do not substitute
them, do not "modernise" them, do not swap them because a specimen looks
better in isolation. They are set once, in `:root`:

```css
--font-display: 'Quicksand', ...;
--font-body: 'Nunito', ...;
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

Other standing rules: no fake user counts, no em dashes in generated copy, and
`Estimates are for planning only and are not loan eligibility` stays wherever
numbers appear.

**These rules are now code.** `tools/lib/copy-rules.mjs` enforces them and
`npm run verify:content` runs it, because until then they bound only whoever
remembered to read this file — and they did not hold: "The back office
platform your school deserves." reached production through two green runs.

One rule is a ratchet rather than a hard failure. `deserves` is on the page in
eight places, and taking it off is a positioning decision for the owner, not a
side effect of adding a test. So `KNOWN_DEBT.entitlement` records the count,
every run prints the remaining lines, and the check fails when the count
**rises**. Lower it as the copy improves. Never raise it to get a run green.

## 3. Checks — run these, they have each caught a real bug

```
npm test                        # everything below, in order, plus the feature suite
node tools/verify-content.mjs   # files: redirects, structured data, voice rules, anchors, fonts
node tools/verify-render.mjs    # layout: stretched images, heading order, overflow, dead CTAs
node tools/verify-headers.mjs   # the CSP does not block the page it protects
node tools/build-images.mjs     # regenerates icons + OG card, asserts the fonts loaded
npx cucumber-js                 # the same checks, read as specifications
```

Cucumber is the repo's **only** dependency, and it is a devDependency: it
never reaches a browser, so the CSP goes on forbidding every external origin
and the site still ships as one static file. `node_modules/` is gitignored
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
  `_redirects` so a typo cannot become a dead CTA on a live page.
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

## 5. Netlify specifics

- `_headers` carries the CSP and cache rules. It allows **no external origin** —
  adding any third-party script (analytics, embeds, fonts) means editing it,
  and then re-running `verify-headers.mjs`.
- `_redirects` canonicalises `www` → apex, and routes tool CTAs through
  `/go/*`. Those are **302 on purpose**: a 301 is browser-cached, so only the
  first click per person would ever reach the CDN and the counts would
  silently undercount. Netlify Analytics reads CDN request logs, which is the
  only reason outbound clicks are countable at all.
- `robots.txt` disallows `/go/` and `/tools/` — neither is a page.
- The lead form is Netlify Forms (`name="early-access"`). Submissions live in
  the Netlify dashboard. **Do not add a third-party form handler** without
  talking to the owner: the list is a company asset and it stays first-party.

## 6. Working agreements

- Small draft PRs, one open at a time. The owner marks ready and squash-merges.
- Never invent a product screenshot. A fabricated dashboard image shipped once
  and had to be pulled: it contained hex codes as card titles and gibberish
  table rows. If there is no real screenshot, ship no screenshot.
- Social/profile URLs cannot be verified from the build sandbox. When adding
  one, say so and ask for a click-through check before merge.
