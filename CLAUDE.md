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

Do not write "reputational assurance" into these notes: it belongs to Bain's
B2B pyramid, not the consumer one we use. The element for "walks into the
lender meeting already holding the answer" is **Badge value**.

Other standing rules: no fake user counts, no em dashes in generated copy, and
`Estimates are for planning only and are not loan eligibility` stays wherever
numbers appear.

## 3. Checks — run these, they have each caught a real bug

```
node tools/verify-render.mjs    # layout: stretched images, heading order, overflow, dead CTAs
node tools/verify-headers.mjs   # the CSP does not block the page it protects
node tools/build-images.mjs     # regenerates icons + OG card, asserts the fonts loaded
```

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
