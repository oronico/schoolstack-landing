# 0013. Enrollment Audit's model

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

`js/enrollment-audit.js` holds the scoring, the plan, the seat math and the
saved-file code. The page loads it before its own script,
`js/enrollment-page.js`, which only draws and keeps answers;
`tools/lib/enrollment-audit.test.mjs` requires it. Its
functions take the audit and return values, never touching the page or
storage, so plain data can test them. A change to the math goes there with a
test. (CLAUDE.md §3)

## Decisions

### Practices and the score

1. In `ITEMS`, `w` is a practice's weight from 1 to 3 (its effect on
   enrollment), `only: "tuition"` hides it from charter schools, and
   `grades` lists the grade ids it shows for.
2. `progress()` marks the score ready once four in five shown practices are
   answered, because an unanswered practice counts as zero and an early
   score would look like a failing one. With all 32 shown, that is
   `ceil(32 × 0.8) = 26`.
3. N/A drops a practice from the score: one Yes and one N/A is 2 of 2
   points, so 100, not 50.
4. `optShown()` offers a force only while a practice it points to is shown,
   so a charter school is not offered a force that could only promote
   tuition-only practices (pl5 points only at c7 and y7).
5. `planned()` builds a plan of `PLAN_SIZE` (9) steps. Each marked force
   first brings in the first open practice on its list, the one that
   answers it most directly; the remaining places go by rank. In the example
   audit, c2 and c3 (score 4) make the plan ahead of nine practices that
   score 4.5.
6. `images/enrollment-scorecard.webp` is a real screenshot of the example
   audit's score (27; stages 29, 36, 33, 21, 10). If scoring moves these
   numbers, retake it.

### Seat math

7. Returning students round to nearest: 72 × 85% = 61.2, so 61.
8. The funnel rounds every step up, because part of a family cannot enroll:
   35 ÷ 65% = 53.8, so 54 offers. It rounds up even where rounding to
   nearest would go down: 15.4 offers become 16.
9. `rateOf()` returns `null` when no rate was entered, never a default, and
   seat math shows no figure that would need one.
10. `RATES` sets each rate's floor; the ceiling is 100. Re-enrollment may be
    0, but the three funnel rates start at 1%, because seat math divides by
    them.
11. `FROM_COUNTS` lists `[rate, numerator, denominator]`: each funnel rate is
    a count over the count above it, filled in once both are entered, and
    rounded to a whole percent (54 ÷ 120 = 45%).
12. `ratesFromCount()` recomputes only the rates that use the changed count,
    so a rate set by hand stays put when an unrelated count changes.
13. `levers()` raises re-enrollment by 5 points and yield by 10, and reports
    how many fewer inquiries each saves. It is called only once the funnel
    is ready; issue #73 tracks making it safe without that.

### Saved audits

14. `clean()` is the one reader for audits from `localStorage` and from
    saved files. It keeps only known fields and values in the expected
    shape, and returns `null` for anything that is not an audit.
15. `clean()` clamps saved rates into their `RATES` range, because saves from
    before the fields had a range can hold any number, and the field should
    show the figure the seat math uses.
16. Audits save to a file the browser downloads and open with `FileReader`.
    Nothing is sent anywhere, as `privacy.html` and the footer promise.
    (CLAUDE.md §7)
17. `SHARE_ENABLED` stays `false` until the Airtable form is published and
    the owner approves a third-party form handler. Turning it on also needs
    `privacy.html` to say what is shared and where, and the footer line
    "They are not sent to SchoolStack" to change. (CLAUDE.md §7)

See ADR 0007 for the names saved audits depend on.
