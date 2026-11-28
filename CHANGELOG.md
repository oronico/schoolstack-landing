# Changelog

Changes to schoolstack.ai, newest first. Dates are when the change was
prepared for review; Netlify deploys on merge to `main`.

## 2026-11-28: A "%" stays with its word
- Enrollment Audit's four rate labels ("Expected re-enrollment %" and the
  three conversion rates) join the "%" to the word before it with a
  non-breaking space. On phones from 330 to 380px wide a "%" sat alone on
  its own line at 9 of 129 widths tried; now it never does.

## 2026-11-28: The voice check reads every link, not a style class
- `ctas()` picked out link CTAs by class (`btn-*`, `nav-cta`,
  `tool-link`), so renaming a class for looks would have dropped those
  links from the "no can't / cannot" check with no warning, against
  CLAUDE.md §9. It now reads every link. None of the site's 299 links
  carried one of the words, so no page changes.

## 2026-11-28: ADR 0002 says how repo files are hidden now
- ADR 0002 still said `robots.txt` blocks `/tools/`, `/docs/` and the
  other repo folders. Since #89 it blocks only `/go/`, and `_redirects`
  answers 404 for the repo's own files. Items 3 and 4 and the
  Consequences line now say so.
## 2026-11-28: Footers lose the founder line
- Every page footer now ends its credit at "SchoolStack is a nonprofit
  venture incubated by Building Hope Impact Fund." The founder line that
  followed it is gone (owner, 28 November 2026: "Remove founder line from
  footer. All footers need to align w general branding"). Enrollment
  Audit's footer follows. The copyright line and the contact email stay.
- `brand-credit.test.mjs` now reads each page's footer and fails if one
  names a founder.

## 2026-11-25: The headline says the job
- The home page headline is "Families and finances, finally together.",
  with "Run your school, not spreadsheets." under it (owner, 25 November
  2026: "Deserve isn't a JTBD"). It was "The back office small schools
  deserve. Built with the people who run them."
- The line under it goes on: "For small schools: recruitment, enrollment,
  budgeting and accounting in one place, so you can see what comes next."
- No page names a student range now (owner: "remove 20-250 so we don't cut
  a customer out"). The hero, the FAQ and its structured data, the share
  text, the giving page's description and `llms.txt` say "small schools";
  the early list drops its range line.
- No page uses "deserves" now, so `KNOWN_DEBT.entitlement` is 0 and any
  new instance fails `verify-content`.
- Enrollment Audit's footer carries the credit line and the copyright line
  every other page has, and `brand-credit.test.mjs` checks it too.

## 2026-11-25: One money parser and one set of render helpers (#70, #104)
- `parseTuition` now calls `parseAmount`, the parser the break-even card
  already used, so the two cards' money fields follow one set of rules.
  Each passes its own messages and limit; no message changes.
- `setOut` and `showFieldError` are written once and shared by both
  cards, instead of a copy inside each.
- Nothing a visitor sees moves: every parser, `calculate()` and
  `breakEven()` give byte-identical results to the code before #104 over
  a grid of inputs, error messages included.

## 2026-11-25: Seat math lines up, and lands on the exact answer
- Enrollment Audit's seat math fields line up in every row. A label that
  wrapped to two lines pushed its input below its neighbour's on phones,
  tablets and small laptops (46 of 129 widths from 320 to 1600px). The
  fields now share rows through CSS subgrid, and each label sits just
  above its own input.
- The seat math could be off by one. Binary cannot hold 0.7 exactly, so
  21 new students at 70% yield showed 31 offers, not 30; 25 students at
  58% re-enrollment showed 14 returning, not 15; and 23 applications from
  40 inquiries showed 57%, not 58%. The "raise re-enrollment" and "raise
  yield" lines were off in about 1 case in 20. Each result is now snapped
  to 9 decimal places before it is rounded, and grids of every
  whole-number input match exact arithmetic.

## 2026-11-24: No inline styles, so the CSP forbids them too
- Enrollment Audit's `<style>` block moved to `css/enrollment.css`.
- Every `style` attribute on the pages became a class. Enrollment Audit's
  script no longer writes them either: its colours are a `data-tone`
  attribute, and its bar widths are set through the element's `style`
  object, which the CSP allows.
- The calculator's two slider fills start from CSS, as its bar does.
- `style-src` in `_headers` is now `'self'` only, and `cspFaults()` fails
  `'unsafe-inline'` there. This finishes #68.
- No page looks different: every element's computed style matches `main`
  on all eight pages, at 1440px and 390px, on screen and in print, light
  and dark, with Enrollment Audit both filled in and cleared.

## 2026-11-24: No inline script, so the CSP forbids it
- The early list form's script moved from `index.html` to `js/signup.js`,
  and Enrollment Audit's page script from `enrollment/index.html` to
  `js/enrollment-page.js`, unchanged byte for byte.
- `script-src` in `_headers` is now `'self'` only, so an injected
  `<script>` cannot run. `cspFaults()` fails `'unsafe-inline'` there.
- `verify-headers` now loads every page in `sitemap.xml` under the real
  headers, not just `/`, so a script left inline on any page fails it.
- Styles still allow `'unsafe-inline'`; moving them out is the second half
  of #68.

## 2026-11-24: verify-content fails, not crashes, on a share card that is not a PNG
- If `og:image` pointed at a file that is not a PNG, `verify-content`
  crashed reading its size and skipped every check after it. It now fails
  with a message naming the file, and the other checks still run.
- The size check moved to `ogImageSizeFault()` in `tools/lib/page-audit.mjs`,
  with unit tests.

## 2026-11-24: Two heredocs on one workflow command
- When one shell command in a workflow opens two heredocs
  (`cat <<FIRST <<SECOND`), the comment check read a `#` line in the second
  body as a comment. It now moves to the next heredoc when one closes.
  Codex found this on #76.

## 2026-11-24: Say "free" for Space, Budget and Access
- The tools band, the 404 page, the home-screen description, `llms.txt` and
  the giving guide said "complimentary" or "at no cost". They now say
  "free", the word founders search for, and still name the three tools.
  CLAUDE.md section 7 states the rule.

## 2026-11-24: The comment check parses JavaScript with acorn
Owner approved.
- `tools/lib/comments.mjs` now finds JavaScript comments with acorn, a
  devDependency that never reaches a browser, in place of 130 lines that
  guessed at JavaScript's syntax and missed cases review kept finding.
- JavaScript that cannot be parsed now fails the check by name. It used to
  be scanned anyway, and could hide a comment.
- CSS, HTML, YAML, TOML and the `#` files keep their own rules.
- Nothing a visitor sees changes.

## 2026-11-24: The home-screen description names the three tools
- When someone adds the site to a phone's home screen, its description read
  "Free planning tools ... funding, and financing". "Financing" pointed at
  Lending Lab, which the site does not promote, and a bare "Free" did not
  name the tools that cost nothing. It now reads "Space, Budget and Access:
  planning tools for small-school founders, at no cost."

## 2026-11-23: The repo's own files are no longer served
- `CLAUDE.md`, `CHANGELOG.md`, `docs/`, `tools/`, `features/` and the other
  repo files answered 200 on the live site. Each now returns a 404, and the
  site has a real 404 page (noindex) with the shared nav and footer.
- robots.txt no longer lists the repo's folders; it disallows `/go/` only.

## 2026-11-23: A readiness checklist at /ready
Seven things a school gathers before its first day on SchoolStack: its
books in QuickBooks Online, reconciled through last month, a chart of
accounts that tells its money apart, a five-year budget, a roster with each
student's funding, last year's statements and the lease.
- Linked from the footer's Resources column on every page and from the
  early list's thank-you panel.
- In the sitemap and every check the other pages run (ADR 0019).

## 2026-11-23: The footer's About list splits in three
The About column carried nine links (owner: "hilariously long").
- Four columns of three on every page: The tools, Resources (Enrollment
  Audit, the giving guide, FAQ), About (About Us, the platform, Building
  Hope Impact Fund) and Connect (Sign up, contact, and the Instagram glyph
  in place of the word, from Simple Icons, CC0).
- On a phone the link columns sit two across instead of one: the home
  page footer is 175px shorter at 390px wide.

## 2026-11-23: Sign up for early access, not "get" it
Early access is not open yet; a school can sign up for it (owner).
- Every "Get early access" button, the early list heading and the search
  and share descriptions now say "Sign up for early access", on every
  page including the giving page. The nav and footer links say "Sign up".
- The hero badge said "Early access now open". It now says "Opening to
  more schools in 2027", which is true and says something the button
  does not.
- `verify-content` fails "Get early access" and "early access open"
  anywhere in page copy or share text.

## 2026-11-22: The giving guide prints as a branded document
- The logo heads the first page, and every page carries the guide's name,
  its address and its page number.
- Each step starts on its own page. Cards, prompts and callouts never
  split across pages.
- Outside links print their address, and the example letter prints open.
- The credit and copyright close the last page, under the early access
  line. The guide prints on ten pages.

## 2026-11-22: Print styles for the giving guide only
- The giving guide's print styles now apply to that page alone. The home
  page and About print in full again, with their buttons, contact band and
  footer (Bugbot on #80).

## 2026-11-22: The giving guide, sharpened
- The opening names the worry first: asking for money feels awkward, and a
  clear ask with real numbers gives people a way to help.
- A note for anyone starting after December 1.
- Step 2 points founders without a cost-per-student figure to SchoolStack
  Budget, and says what to check before choosing a donation tool.
- Step 4 ends with Allison's offer to read a school's draft letter.
- Step 2 lists what gifts can fund, from scholarships to gas cards, and
  how named gifts must be spent.
- Step 4 teaches a three-part story, with a made-up example labeled as one.
- "Pass it on": one tap to email the guide to another founder.
- Prints cleanly, and carries Article structured data for search.

## 2026-11-22: Year-end giving guide at /giving
- A new page for school leaders: year-end giving in one afternoon, from
  the owner's guide. Six timed steps, three send dates, AI prompts and
  email templates with Copy buttons, Gmail mail merge step by step, and
  the IRS receipt rules with links to the IRS pages.
- Linked from the footer's About column on every page and listed in the
  sitemap. Not in the top menu or on the home page.
- The Copy buttons live in `js/site.js` and follow GitHub's
  clipboard-copy-element: the Clipboard API, with a select-and-copy
  fallback.
- Every check that reads the pages now reads `/giving` too.
- Its own link-preview card, `og-giving.png`, built by `build-images` from
  `tools/og-giving.html` in the same design as the site card.
- Its decisions are ADR 0018; the page carries no comments (ADR 0001).

## 2026-11-22: One button style, and a tidy-up
- Every "Get early access" button (hero, early list form, the footer of
  every page) now looks the same: one style, where there were three
  with different padding, borders and hovers. The footer one gains the
  hero's arrow.
- The SchoolStack logo in the nav, and on Enrollment Audit, is now a
  48px tap target on phones (it was 32px). Nothing on screen moves.
- Styles nothing used are gone from the stylesheet (the old consent
  checkbox and two form layouts); every page looks the same pixel for
  pixel.
- A check now opens Enrollment Audit as a phone's touch screen and fails
  if any control drops under 44px or any field under 16px text.

## 2026-11-22: No code comments
Owner request.
- All 676 code comments were sorted and 675 deleted: 1,514 lines. 455
  recorded a decision, 195 repeated the code, 21 were stale and 12 excused
  a shortcut.
- The decisions now live in 17 ADRs under `docs/adr/`, by topic.
- The shortcuts are issues #68 to #74, plus #75 for a decision the code no
  longer meets.
- `verify-content` now fails a new comment. `COMMENT_DEBT` records the one
  left, the generated licence header in `fonts/fonts.css`.
- `/delete-comment` repeats the sort.
- Nothing a visitor sees changes. The pages lose their HTML comments, and
  `robots.txt` now disallows `/docs/` and `/.claude/`.

## 2026-11-22: Body copy in Inter, the brand's text face
- Body copy on every page, Enrollment Audit and the link-preview card is
  now Inter, as in Space, Budget and Access (owner). Headings stay in
  Quicksand; the logo's lettering stays Montserrat ExtraBold, drawn into
  the SVG. The site was the only SchoolStack app setting copy in Nunito.
- Inter is self-hosted like the other faces, one variable file for
  weights 400 to 800: 48 KB, 9 KB more than Nunito.
- The two Nunito files are gone from `fonts/` (owner approved).

## 2026-11-21: Five more stable names
- A replaced image in `/images` (funder logos, the scorecard) now reaches
  returning visitors at once. Each link carries its file's content hash,
  as the icons already do; it used to stay cached for up to a week.
- An old `#design-partners` link now lands exactly where `#early-access`
  does. It used to scroll the band's top edge under the nav.
- The sitemap no longer carries dates typed by hand. Every page changed
  on 21 November while the sitemap still said 8 November.
- The phone menu's script and the calculator check find their parts by
  id or `data-calc`, so renaming a style class breaks nothing quietly.

## 2026-11-21: Enrollment Audit's math moves into its own file, with tests
Owner request: guardrails.
- Scoring, the 90-day plan, the seat math, rates from counts and saved
  files move from the page's script into `js/enrollment-audit.js`. The
  page loads it, and so do 21 new unit tests in
  `tools/lib/enrollment-audit.test.mjs`, each sum worked by hand first.
- One test opens a saved file written out by hand on 21 November, so a
  later change cannot lock visitors out of the audits they saved.
- Nothing a visitor sees changes: the page was loaded with six saved
  states before and after the move, and the plan, scores, seat math,
  calendar and saved answers matched in every one.

## 2026-11-21: Enrollment Path is now Enrollment Audit; Space asks a question
Owner request.
- Enrollment Path is renamed Enrollment Audit everywhere a reader sees it:
  the nav and footer on every page, the home page band and its picture's
  description, the privacy policy, and the tool's own title, heading and
  copied plan. A saved file is now named `enrollment-audit-...json`.
- The browser storage key and the saved-file tag keep the old name, so
  audits saved before the rename still open.
- The Space card now asks a question, like Budget and Access, to match the
  heading "Start with the question in front of you.": "Who are the
  families near me, and what space fits my school?"

## 2026-11-21: Enrollment Path saves to a file and opens one
Owner request after the same walk-through.
- "Save to a file" writes the audit to a small JSON file on the visitor's
  device. "Open a saved file" reads one back, on this device or another.
  Nothing is sent: the browser writes and reads the file itself.
- A file that is not a saved audit is refused and the answers on screen
  stay as they were.
- Answers from the browser's storage and from a file now pass through one
  reader, which keeps only what the tool knows.
- `privacy.html` is unchanged and still true. Whether it should name the
  file is for the owner and counsel.

## 2026-11-21: Enrollment Path works out conversion rates from counts
Owner request after the same walk-through.
- Under "Your conversion rates", a school can open "Work them out from
  last year's counts" and enter inquiries, applications, offers and new
  students enrolled. Each rate fills in once its two counts are entered,
  rounded to a whole percent and kept within 1 to 100. The rate fields stay
  editable, and the counts save in the browser with the other answers.

## 2026-11-21: Enrollment Path holds the score and shows progress
Owner request after the same walk-through.
- The score and the five stage scores show once four in five practices are
  answered. Before, a new audit read "0 out of 100", and every unanswered
  practice counted as zero until the last answer. The copied plan says
  "Audit in progress" until then.
- On screens where the scorecard sits under the practices (980px and
  narrower), a line with "12 of 30 answered" stays at the top while the
  visitor answers, and shows the score once it is ready.
- A rate saved outside its range before #61 is brought into it when the
  page loads. Found by Bugbot on #61.

## 2026-11-21: Enrollment Path plan fixes from a walk-through
Owner approved after a full test audit on the live page.
- Each force a school marks now brings its most direct open practice into
  the 90-day plan. Before, "Is this a real school" could be marked and
  "Show you are a real school" left out.
- Open practices past the plan's nine steps are listed under "Also open",
  on the page and in the copied plan. Before, they were dropped.
- A force is offered only while a practice it points to is on screen. A
  public charter no longer sees "ESA or scholarship makes it affordable".
- The chosen state names itself in the cost and aid calendar lane and the
  copied plan's title. The intro no longer says the profile shapes the seat
  math, which it never did.
- A rate typed outside its range is set to the nearest value the seat math
  uses (1 to 100; re-enrollment 0 to 100), so the field shows what is
  counted.
- The "Partly" status line was 3.19:1 on white. It is now 5:1.

## 2026-11-21: The SchoolStack suite's ownership and credit words
schoolstack.ai now says who owns SchoolStack and who founded it in the same
words as Space and Access (docs/brand/suite-language.md in the SchoolStack
Space repo).
- Every page footer carries the credit: "SchoolStack is a nonprofit venture
  incubated by Building Hope Impact Fund. Founder & Product Developer:
  Allison Serafin". The copyright line names Building Hope Impact Fund, not
  "SchoolStack".
- The home page line under the hero, the "Who is behind this" band and the
  About page use counsel's sentence. Their headings read "Incubated by", not
  "A program of" or "Incubated at".
- "A program of Building Hope Impact Fund" stays in the Terms and Privacy
  legal text, which counsel owns.
- LICENSE: Building Hope Impact Fund owns the site; the founder credit
  grants no rights. Same text as Space (owner approved).
- `tools/lib/brand-credit.test.mjs` checks all of it.

## 2026-11-21: A link to a FAQ question shows the question
- A link such as `/#faq-cost` scrolled the question under the fixed nav,
  so only its answer showed. It now stops 96px down, clear of the nav at
  every width. Found by Bugbot on #57.
- The layout check now tries every FAQ question as well as the nav and
  footer links.

## 2026-11-21: One stable name for each thing
Things a link, a check or a saved answer finds by name now have one
name that does not change when the wording or the order does.
- The early list band is `#early-access` everywhere, the same name as
  its form. Every nav, footer and hero link used the retired name
  `#design-partners`. The three old names still land on the band, so
  links already shared keep working.
- Each FAQ question has its own link (`/#faq-cost` opens the answer).
  The check that the search-engine copy matches the visible FAQ now
  pairs questions by that name, so reordering them no longer fails it.
- Enrollment Path saves grades by id. Rewording a grade label used to
  lose the saved choice and hide the practices meant for those grades.
  Answers saved before this change read back unchanged.
- The white logo's file name carried the colour logo's hash, so a later
  edit could have been cached for a year under the wrong name. It now
  has its own. Checks now fail a wrong hash, a stale `?v=` on the icons
  and link-preview card, and an image path written relative to the page.
- Eight files nothing linked to are gone (owner approved): the old white
  logo, two old icon files, the two Lending Lab logos and three spare
  funder images. Budget and Space serve their own copies of the two
  names they share.

## 2026-11-21: One logo size
- The SchoolStack logo shows 32px tall (203px wide) in the nav, the footer
  and Enrollment Path's masthead. It was 27, 28 and 26px, all narrower
  than the design kit's 200px minimum.
- On phones under 360px wide the nav logo narrows, keeping its shape, so
  the menu button still fits. The desktop nav bar is 5px taller.

## 2026-11-21: No more "applications" in what visitors read
SchoolStack collects interest on an early list; it does not take
applications (owner, November 2026).
- The link-preview card said "Applications open" and "Apply to help build
  the platform". It now says "Early access open" and "Join the early list
  for the full platform in 2027."
- The privacy policy's Security paragraph says "Early list sign-ups", not
  "Applications".

## 2026-11-21: One brand navy
- The site's text and dark bands now use #1E293B, the navy of the
  SchoolStack wordmark, the product logos, the design kit and all three
  apps. The site was the only place using #141E33. The browser theme
  colour, the web app manifest and the link-preview card follow.
- Nothing else moved: with the old value forced back in, every page
  matches the previous version pixel for pixel. Every text pair still
  passes AA; the lowest involving navy is ink on amber, 8.8:1.

## 2026-11-21: Enrollment Path on phones: no zoom, bigger targets
- On a touch screen, Enrollment Path's fields now use 16px text. Below
  that, iPhone Safari zoomed the page every time a field took focus, on
  all 12 fields.
- On a touch screen, every control is at least 44px tall, the size the
  rest of the site holds: the 128 answer buttons and 5 grade chips (were
  32px), the force options (38px) and the buttons (41px).
- With a mouse, the page is unchanged, pixel for pixel.

## 2026-11-20: Remove the old tool logos; check images at larger text
- The six logo files the tool cards used before #49 (Space, Budget and
  Access, each with a white copy) are gone. Nothing on the site or in
  the three product apps linked to them.
- The render check now also looks at every image with the text at 150%,
  the size that squashed the tool logos after #49.

## 2026-11-20: Keep the tool logos in shape at larger text sizes
- With the browser's text size set larger, the new tool logos squashed:
  their height grew with the text but their width hit the card's edge
  (at 150% they lost up to 44% of their width). They now shrink to fit,
  keeping their shape. Found by Bugbot on #49.

## 2026-11-20: New Space, Budget and Access logos
- The tool cards carry the new product lockups: the SchoolStack wordmark
  in navy, the product name under it in the product colour. Space and
  Budget are the files from their own repos. Access had no SVG yet, so its
  name was outlined from the kit's Montserrat ExtraBold the same way; the
  same steps rebuild the other two pixel for pixel.
- The logos show at 48px tall (213px wide), above the kit's 200px minimum.

## 2026-11-19: A refresh aimed at early access
Grounded in what founders said in design partner calls and demos.
- The hero says who SchoolStack is for, schools of 20 to 250 students,
  and makes "Get early access" the main button. "Explore the free tools"
  is second. A line says it works with QuickBooks Online.
- The platform band trades its five feature labels for the four jobs
  founders named: making payroll, who owes tuition, filling seats, what to
  show the board. A box under them says SchoolStack is built on QuickBooks
  Online, and that schools on another platform can move with our
  accounting partner by emailing Allison.
- The early list is now "Get early access", names the 20 to 250 range, and
  points schools on other platforms to Allison. The footer link and the
  form button say "Get early access" too.
- Two new FAQ answers: which schools SchoolStack is for, and what happens
  for schools on another accounting platform.

## 2026-11-19: Say which tools are complimentary
- The philanthropy line under the tool cards now names them: "Space,
  Budget, and Access are complimentary for every school, funded by
  philanthropy so more schools can flourish." On its own, "Complimentary
  for every school" read as if the platform were free too.
- The Budget and Access cards now ask the question each tool answers, under
  the heading "Start with the question in front of you.": "How do I build a
  five-year financial model?" and "What is the education freedom tax
  credit?"

## 2026-11-19: Free tools first, and no "closed beta"
- The three free tools now sit directly under the hero. The first tool card
  was 3.6 screens down on a laptop and 4.3 on a phone; it is now on the
  first screen of a laptop and 1.2 screens down on a phone. The
  philanthropy line moves under the cards, and the film and the early list
  follow.
- Less copy. Each tool card is now a logo, one line and a link, and the
  whole card is the link. The hero keeps one subtitle; the platform band
  keeps the film, its chips and one note; the early list keeps one line
  above the form. The home page goes from 1,364 words to 1,106, and the
  first tool card now shows on the first screen of a phone as well.
- "Closed beta" is gone from the site. The page now says design partner
  schools use SchoolStack today and it opens to more schools in 2027, and
  "early access" replaces "beta" in the hero, the form, the footer, the
  share-card text, the privacy policy and the terms.

## 2026-11-19: One sign-up
- The site now has one sign-up, the early list. The footer's "Stay ready."
  block keeps its heading and links to the early list instead of carrying
  its own form.
- The `mailing-list` form, its script in `js/site.js`, its checks and its
  privacy-policy section are gone. Addresses it already collected stay in
  the Netlify dashboard, and the privacy policy still covers them.

## 2026-11-18: Film first, an early list, and who pays for the tools
- The platform band, film on top, now sits directly under the hero, with
  the early list right after it. The tools and the snapshot follow.
- The design partner application is an early list again: first name, work
  email, school, state, and an optional accounting question (the beta
  starts with QuickBooks Online schools). Joining is the request for beta
  news and product updates, so the separate email checkbox is gone. The
  Netlify form keeps its name, `early-access`.
- The hero, nav, footer, share-card text, privacy policy and terms now say
  early list and closed beta, not applications.
- The tools band says the tools are complimentary, funded by philanthropy
  so more schools can flourish, and thanks Stand Together Trust and the
  Beth and Ravenel Curry Foundation.

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
