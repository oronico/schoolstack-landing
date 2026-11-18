# Changelog

Changes to schoolstack.ai, newest first. Dates are when the change was
prepared for review; Netlify deploys on merge to `main`.

## 2026-11-18: The platform film
- The owner's 82-second film of SchoolStack now plays in the platform band.
  It starts only when pressed, so its voiceover is heard, and downloads
  nothing but its 2 KB captions until then. The video is a 3.8 MB, 720p cut
  of the 4K original; the poster is a frame from it.
- Captions are on by default and match the narration word for word,
  including the closing "deserve" line, which repeats the hero.
- A line under the film says it shows the closed beta with design partners,
  opening more widely in 2027. The platform note no longer calls the rest
  "planned".
- The focus check now skips focus inside the browser's own player buttons,
  which the page cannot style or read; the video itself is still checked.
- Files: `index.html`, `css/site.css`, `assets/video/`,
  `tools/lib/focus-audit.mjs`, `tools/lib/harness.mjs`, `CLAUDE.md`.

## 2026-11-18: What the agents kept getting wrong
An audit of the last 60 days found Cursor Bugbot findings landing minutes
after each merge, unread. This fixes the three that were live bugs, adds
the checks that would have caught them, and writes the lessons into
CLAUDE.md.
- **Calculator cents (#31):** the snapshot printed "$10,001 × 50 students"
  for $10,000.50 a student. Its working line and total are now exact to the
  cent, as the break-even card's have been since #32.
- **Enrollment Path's hidden rates (#35):** a blank re-enrollment or
  conversion rate was silently replaced by the example's (85, 50, 80, 65
  percent). Now a figure that needs a rate waits for it, and the page says
  which rate to enter. The example audit and fully filled audits give the
  same numbers as before.
- **Invisible focus (#39):** the consent checkbox's ring was ink on the ink
  band; the thank-you panel's was accent on paper at 1.6:1. The new focus
  check also found Enrollment Path's masthead ring at 2.64:1. All three now
  clear 3:1.
- **Enrollment Path's answer buttons:** Codex showed the first focus check
  measured the hidden radio, not the ring drawn on its label. Measured
  properly, a focused "Not yet" ring was 1.19:1 on red and "Partly" 1.74:1
  on amber. A checked answer's ring now takes the answer's text colour,
  4.5:1 or better on every fill. In the dark theme the green and red
  answers' white text was itself 2.9:1; it is now dark text, 5:1.
- **New checks:** `verify-a11y` tabs through every page and fails an
  invisible focus ring; `working-lines.test.mjs` fails a printed sum that
  does not add up. Each was shown to fail on the old code.
- **CLAUDE.md:** build only what was asked, and a PR is not ready until
  Codex and Bugbot have reviewed its latest commit.
- Not reproduced, so not changed: Bugbot's tablet overflow on #40 (no
  sideways scroll at 640 to 800px) and its FAQ-headings finding (Chromium
  still exposes them as headings; Safari with VoiceOver is untested).
- Files: `js/budget-calculator.js`, `enrollment/index.html`,
  `css/site.css`, `tools/verify-a11y.mjs`, `tools/lib/focus-audit.mjs`,
  `tools/lib/working-lines.test.mjs`, `CLAUDE.md`, `CHANGELOG.md`.

## 2026-11-18: A SchoolStack mailing list
- A sign-up in the footer of every page, headed "Stay ready.": one email
  field and a "Join the list" button. It is a second Netlify form,
  `mailing-list`, so the design partner application and its notifications
  are untouched. Netlify collects the addresses; the emails themselves go
  out from whatever tool the owner picks, by export.
- It follows the application's state machine: `idle`, `submitting`,
  `failed`, `submitted` on `#newsletter[data-state]`, driven by
  `js/site.js` so it works on every page.
- `privacy.html` has a "When you join the mailing list" section listing the
  one field, and says how long an address is kept.
- The privacy field check now holds each form to its own list
  (`data-form`), so a field listed for one form cannot cover another.
- `verify-form` checks the sign-up on `/` and `/about`: the Netlify
  contract, success, server error, dropped network, in flight, retry and an
  empty submit. Breaking its retry path, or removing its privacy line, fails
  the checks.
- Files: `index.html`, `about.html`, `privacy.html`, `terms.html`,
  `js/site.js`, `css/site.css`, `tools/lib/page-audit.mjs`,
  `tools/lib/page-audit.test.mjs`, `tools/lib/form-scenario.mjs`,
  `tools/verify-content.mjs`, `tools/verify-form.mjs`, `CLAUDE.md`,
  `CHANGELOG.md`.

## 2026-11-17: Enrollment Path, easier to find
Enrollment Path was reachable only from the nav (last of six items) and,
on phones, from behind the menu.
- A home page band after the calculator: "Fill the seats your budget
  counts on", a short description, a button to start the audit, and a
  real screenshot of the tool's scorecard for its built-in example school
  (`images/enrollment-scorecard.webp`). It sits apart from the three tool
  cards, so the site still counts three tools, and it never says free.
- Under the break-even result: "Know the number. Now plan how you'll
  enroll them", linking to the audit. The break-even answer and the
  tool's seat math start from the same number.
- The footer's About column links it on every page.
- The band is ink, full-bleed, so the page no longer runs 4.6 desktop
  screens of paper before its first change of ground. Its button is the
  outline style: the calculator's "Build my five-year budget" stays the one
  yellow button in view.
- The FAQ answers fold under their questions (native `<details>`, no
  script). The FAQ check in `verify-content` now allows a `</summary>`
  between question and answer, and still compares every word.
- The partners band and the Building Hope band are one band: "A program of
  Building Hope Impact Fund", then the incubator and the two funders side
  by side, each under a small label. One full-size heading fewer.
- The home page is 652px shorter at 1440 and 806px shorter at 390.
- Files: `index.html`, `about.html`, `privacy.html`, `terms.html`,
  `css/site.css`, `images/enrollment-scorecard.webp`,
  `tools/verify-content.mjs`, `CLAUDE.md`, `CHANGELOG.md`.

## 2026-11-16: One spacing scale, one type scale, five colours
Rebuilt `css/site.css` (1,085 lines to 870) for the four site pages.
- Fixes the five biggest hierarchy and density problems found in
  screenshots at 1440 and 390px: headings that did not rank (h1 40.8px
  over eight 36px h2s), 30 painted text sizes with 44% of characters under
  15px, 67 colour values and 21 gradients that carried no meaning, a dense
  calculator band, and a navy band of boxes inside boxes.
- Now: 6 painted text sizes, none under 15px; 5 colour tokens; 9 spacing
  steps; no gradients or drop shadows. The h1 is 44px over 29px band
  headings. The FAQ and the cohort exchange are lists with rules, not
  cards; the application fields are paper on ink; the eyebrows are
  sentence case.
- The partners and Building Hope bands step down a size: they support the
  page rather than lead it.
- Contrast is now computable on every element (no gradient behind text),
  and passes at both widths on every page.
- No copy, markup structure, behaviour or check changed. One inline
  `margin-top` left the FAQ markup.
- Files: `css/site.css`, `index.html`, `CLAUDE.md`, `CHANGELOG.md`.

## 2026-11-16: UI state named on the page
Each home page component that changes as a visitor uses it now keeps its state in one
place and names it as an attribute. CLAUDE.md section 8 lists them.
- The design partner application is a four-state machine (`idle`,
  `submitting`, `failed`, `submitted`) on `#signup[data-state]`, in place of
  a `pending` flag and three separate display toggles. The wording, the
  focus move and all four outcomes are unchanged. Moves are keyed by event
  (`SUBMIT`, `SUCCEED`, `FAIL`), the shape XState, Robot and
  javascript-state-machine use; no library is added.
- New working agreement in CLAUDE.md section 6: search open-source projects
  and compare their approaches before writing an unfamiliar feature.
- `verify-form` and `features/signup.feature` now check the state after
  each outcome, and walk a new path: an error, a second try, then success.
- `verify-headers` no longer fails local runs on Chromium builds that call
  `interest-cohort` an unrecognized feature. Only that exact message is let
  through; the header itself is unchanged.
- Files: `index.html`, `css/site.css`, `tools/verify-headers.mjs`,
  `tools/lib/form-scenario.mjs`, `tools/verify-form.mjs`,
  `features/signup.feature`, `features/step_definitions/signup.steps.mjs`,
  `CLAUDE.md`, `CHANGELOG.md`.

## 2026-11-15: Enrollment Path in the menu
Added Enrollment Path at /enrollment, reached from the main menu.
- Enrollment Path is a recruitment and enrollment self-audit, not a fourth
  product, so it has no tool card and the site still counts three tools.
  It sits last in the desktop nav and the phone menu on every page.
- `/enrollment` redirects to `/enrollment/`, so both addresses open it.
- `assets/logos/schoolstack-enrollment-logo.svg` is added for later use,
  built like the Space, Budget and Access logos in teal.
- Files: `index.html`, `about.html`, `privacy.html`, `terms.html`,
  `_redirects`, `assets/logos/schoolstack-enrollment-logo.svg`,
  `CLAUDE.md`, `CHANGELOG.md`.

## 2026-11-15: Enrollment Path at /enrollment/
- Added the owner's Enrollment Path tool as a stand-alone page: a
  five-stage enrollment audit, the forces that move families, a 90-day plan,
  seat math and a recruitment calendar. Answers stay in the visitor's
  browser.
- Fitted to the site's rules: Quicksand and Nunito self-hosted in place of
  Google Fonts (Inter, Montserrat), which the CSP would have blocked; the
  real wordmark in the masthead; the Budget link through `/go/budget`; a
  skip link; the planning-only disclaimer and links home, About, Privacy and
  Terms in the footer; small stage labels darkened to pass contrast.
- The share-your-numbers block stays off until its Airtable form is
  approved and the privacy policy covers it.
- `privacy.html` now says Enrollment Path saves answers in the browser.
- Not yet linked from the home page or nav.

## 2026-11-08: QuickBooks rollout in the FAQ
- The FAQ, platform note and terms now say the QuickBooks Online
  integration starts rolling out with design partner schools in November
  2026 (cash-basis schools first), with Gusto still planned.
- New FAQ: "Which QuickBooks Online plan do I need?" Advanced is not
  required; nonprofits should review it for Form 990 categorization.

## 2026-11-08: Privacy policy and terms of use
- Added `/privacy` and `/terms`, linked from the footer on every page and
  from the design partner application. Drafted from what the site actually
  does; for legal review before merge.
- `verify-content` now holds the privacy policy to the code: every
  application field must be listed, and no page or script may use cookies.
  Both pages join the shared nav and footer, render and accessibility checks.

## 2026-11-08: Three tools, the planned platform, and an About page

### Added
- **About Us page** at `/about` (`about.html`): the approved copy, the
  incubator relationship with Building Hope Impact Fund, biographies for
  Allison Serafin and Daniel Crook with labelled contact links, and the five
  values. Text-led, since no approved headshots exist.
- About Us in the main nav, the new phone menu and the footer.
- A phone and narrow-tablet menu (below 900px). Before this, phones showed
  only the "Apply to join" button and none of the section links.
- A shared stylesheet (`css/site.css`) and script (`js/site.js`) for both
  pages, and a check that the two pages' nav and footer stay identical.
- `/about` in `sitemap.xml`, and a `/about` rewrite in `_redirects`.

### Changed
- Home page order: hero, three tools, calculator, planned platform, design
  partners, a short founder introduction, supporting organizations, FAQ.
- Hero: new supporting paragraph; "Explore the free tools" (primary) and
  "Become a design partner" (secondary).
- Tools section rewritten for Space (community intelligence and facilities),
  Budget and Access, with new buttons. Three cards in one row on wide screens.
- Platform section: "In development for 2027", QuickBooks Online as the
  system of record and a planned Gusto integration. QuickBooks Online
  Advanced is no longer presented as required.
- FAQ: three tools, no Lending Lab, and a new answer on QuickBooks and Gusto.
  The structured-data FAQ matches it word for word.
- Calculator wording only: "Remaining for other expenses and reserves",
  "Other expenses and reserves", "Tuition and funding", new interpretation
  messages, and the starting allocations labelled as illustrative. The 15%
  facilities ceiling note and the 60% staffing benchmark line are gone. The
  arithmetic is unchanged: 61,026 input combinations compared against the
  previous version with no differences.
- The long founder quote on the home page is replaced by a short
  introduction linking to `/about`.
- Share card (`og-image.png`) and its alt text: three tools, and "Nonprofit
  program" in place of a 501(c)(3) chip that read as SchoolStack's own status.

### Removed from the public site
- Lending Lab: its tool card, footer link, FAQ entry, post-application link,
  platform promise and share-card mention. Its `/go/lending-lab` and
  `/go/screener` redirects are kept so shared links keep working.

## 2026-11-04: Durability snapshot
- Added the durability snapshot calculator to the home page (PR #31).
