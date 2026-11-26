# The claims standard

Adopted by the owner on 26 November 2026, for every SchoolStack site:
schoolstack.ai, Space, Budget, Access and Lending Lab. ("I want to ensure
that everything we say an app can do, it can do. And if it can't, then we
take it off the landing page or any statement that says this is what you
can expect.")

A claim is any line that tells a reader what they will get: a headline, a
card, a button, a deliverables list, an FAQ answer, an email, a meta
description, a share card, `llms.txt`. Each one must pass all six tests
before it ships. If it fails one, narrow it until it passes or take it off.

## The six tests

1. **It works today.** A new founder can reach it from the landing page
   and see it work, end to end. Not "coming soon", not staff-only, not on
   some models only. If it needs a free account, the claim says so.
2. **The app's own words.** The claim uses the label the app shows. A
   feature the app calls "Space Calculator" is not "space plan" on the
   landing page.
3. **Every number has a source.** The owner's words with a date, or the
   code that produces it. No "hundreds of schools", no "in minutes", no
   "25 years" without one.
4. **No outcome we do not control.** No "lender-ready", "approved",
   "funded", "compliant" or "eligible". We give planning tools; a lender,
   a state or counsel decides.
5. **The founder's job, honestly answered** (Jobs to be Done, after Bob
   Moesta). The headline names the progress the founder wants, in their
   words. The page answers the four forces: the push of today's struggle,
   the pull of the better way, the anxiety about switching, and the habit
   of the spreadsheet. Anxiety is answered by telling the truth about
   limits, not by promising past them: a promise that breaks the first
   time a founder relies on it costs more trust than it ever earns.
6. **The YC landing playbook** (`docs/landing-playbook.md`). Say what they
   get, show the real product, use real proof, ask for one clear action.

## How to check

- Walk it. Start at the landing page, follow each button as a new
  founder, and produce the deliverable (the workbook, the PDF, the
  letter). A code search is not enough: the November 2026 audit found
  claims that read true in the source and failed in the browser.
- Keep a ledger: claim, file and line, verdict (true, partly, false,
  unsourced, owner fact), evidence (a screenshot or the deliverable).
- An owner fact is a line only the owner can confirm, such as what design
  partner schools use. Ask her; do not guess, and do not ship it on a
  guess.
- Legal pages (Terms, Privacy) go to counsel. List the gap; do not edit.

## Where it is enforced

Each repo's copy tests pin the lines that once failed (for example
`ACCESS_CLAIM` and `BETA` in `tools/lib/copy-rules.mjs` here). When a walk
finds a new false claim, fix it and add the pin in the same pull request,
so it cannot come back.
