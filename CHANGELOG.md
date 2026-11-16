# Changelog

Changes to schoolstack.ai, newest first. Dates are when the change was
prepared for review; Netlify deploys on merge to `main`.

## 2026-11-16: UI state named on the page
Each component that changes as a visitor uses it now keeps its state in one
place and names it as an attribute. CLAUDE.md section 8 lists them.
- The design partner application is a four-state machine (`idle`,
  `submitting`, `failed`, `submitted`) on `#signup[data-state]`, in place of
  a `pending` flag and three separate display toggles. The form carries
  `aria-busy` while a request is out. The wording, the focus move and all
  four outcomes are unchanged. Moves are keyed by event (`SUBMIT`,
  `SUCCEED`, `FAIL`), the shape XState, Robot and javascript-state-machine
  use; no library is added.
- New working agreement in CLAUDE.md section 6: search open-source projects
  and compare their approaches before writing an unfamiliar feature.
- `verify-form` and `features/signup.feature` now check the state after
  each outcome, and walk a new path: an error, a second try, then success.
- Enrollment Path: the two-click "Clear all answers" button names its state
  (`idle`, `armed`), and fixes a bug where a timer left from an earlier
  click disarmed the button a second after it was armed again. The page
  names its mode (`example` or `own`) on `<body>`.
- Files: `index.html`, `css/site.css`, `enrollment/index.html`,
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
