# 0012. Calculator math

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

`js/budget-calculator.js` holds the durability snapshot and the break-even
card. The page, the unit tests and the feature steps all load it, so the
tests run the shipped code. (CLAUDE.md §3)

## Decisions

### The file

1. It is one UMD file: the browser loads it as a classic script and it
   mounts on `[data-budget-calculator]`; Node requires it in the tests.
2. The markup carries the default values, so the section reads right before
   the script runs and nothing moves when it does.
3. The snapshot is a one-year illustration, never called a budget:
   SchoolStack Budget builds the five-year plan. It groups costs and does
   not class staffing as outside program. (CLAUDE.md §3, §7)
4. `DEFAULTS` (15% facilities, 60% staffing) are illustrations to adjust,
   not benchmarks; no code treats them as a ceiling or a norm. Tuition is
   the average a school expects to collect per student, net of discounts,
   so the snapshot stays two inputs and two sliders. (CLAUDE.md §7)
5. `TIGHT_BELOW_PCT` (15) only prompts a check that what remains still
   covers other costs. Nothing reads a remainder of 15% or more as healthy,
   and a high facilities share alone is never flagged. (CLAUDE.md §7)

### Money

6. Money is held in whole cents, so decimal tuition multiplies exactly:
   $0.10 for 3 students is 0.3, not 0.30000000000000004.
7. `parseTuition` and `parseAmount` round input to the cent rather than
   reject a third decimal place: "12.345" becomes 12.35.
8. `parseCount` accepts a whole number written with a point ("50.0") and
   rejects a true fraction ("50.5") with a whole-number message.
9. `calculate()` clamps and rounds both percentages through `clampPct`,
   because the exported API takes any value even though the sliders cannot
   leave their range.
10. `calculate()` works out what remains as revenue minus the two rounded
    allocations, not by rounding its own percentage, so the three parts add
    back to revenue to the cent. A negative remainder is a deficit.
11. `formatUSD()` rounds to the dollar and writes a negative with a true
    minus sign (U+2212), not a hyphen, so a deficit is easy to see. Tests
    match on that character.
12. `formatUSDExact()` shows whole dollars for a whole figure and cents
    otherwise. Revenue, working lines and the break-even sentence use it:
    rounding $600,000.25 to "$600,000" made "$600,000 ÷ $10,000" look like
    exactly 60 beside the right answer, 61. `revenueFormula()` uses it too,
    so the printed "price × students" multiplies out to the printed total.
    `tools/lib/working-lines.test.mjs` reads every working line back, because
    this mistake shipped twice (#32, #31). (CLAUDE.md §3)

### Break-even

13. `breakEven()` divides total yearly expenses (debt service in, one-time
    purchases out, the basis SchoolStack Budget uses) by funding per student
    and rounds up to a whole student: $600,001 at $10,000 needs 61, because
    60 leaves the school $1 short. (CLAUDE.md §3)
14. It divides whole cents, then two `while` loops nudge the quotient to the
    smallest whole count whose collections reach expenses, so a float a hair
    off a whole number cannot move the answer ($490 at $0.70 is exactly 700).
    Do not replace them with `Math.ceil(e / p)`.

### The bar

15. In the bar, facilities is `--ink`, staffing `--muted` and what remains
    `--accent`, so the eye goes to what is left.
16. `barSegments()` never returns a negative width. Past 100% the track
    rescales to the total, `revenueMark` marks where revenue ends, and the
    hatched `.seg-deficit` runs from that mark to the end, over the
    allocations: 40% + 85% puts revenue at 80% and the deficit at 20%. The
    mark and the legend say it in words too, so colour is never the only
    signal.
17. Past 100%, `render()` hides the "Other expenses and reserves" row and
    shows "Over the tuition and funding entered", so the shortfall is not
    listed twice.

### Invalid input

18. While a field is invalid, both `render()` functions keep the last valid
    figures on screen, mark the card `data-stale` and show the field's
    error, rather than drop the figures to $0. (CLAUDE.md §8)
