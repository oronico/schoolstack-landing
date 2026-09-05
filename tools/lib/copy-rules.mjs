/**
 * The voice rules from CLAUDE.md section 2, as code.
 *
 * Until now those rules lived only in Markdown, so they bound whoever
 * remembered to read it. They did not hold: "The back office platform your
 * school deserves." shipped to production through two full green runs, and
 * "deserves" is named in CLAUDE.md as retired.
 *
 * Everything here is a pure function over the HTML string. No browser, no
 * server, no filesystem - so verify-content.mjs, the unit tests and the
 * Cucumber steps all assert against the same code rather than three copies
 * that drift.
 *
 * The rules split two ways:
 *
 *   FAULTS are hard failures. The page satisfies all of them today, so this
 *   locks in wins rather than reporting an outstanding mess.
 *
 *   DEBT is the ratchet. "deserves" is on the page eight times and taking it
 *   off is a positioning decision for the owner, not a side effect of adding
 *   a test. So the count is recorded here and the check fails when it RISES.
 *   It can only go down. Every run prints the remaining instances by line, so
 *   the debt is loud rather than buried.
 */

/* Comments, code and styles are not copy. A CSS class called `cannot-x` or a
   code comment weighing up the word "deserves" must not trip a voice rule.
 *
 * Two things this gets right that the obvious version does not:
 *
 *  - The JSON-LD block is KEPT. It is a <script>, but its contents are the FAQ
 *    answers Google reads, they must stay word for word identical to the
 *    visible FAQ, and they are as much a reader surface as the page. Stripping
 *    every <script> hid one instance of "deserves" from the first run of this
 *    check.
 *  - Removed regions are replaced by their own newlines, so every line number
 *    reported downstream still points at the right line of index.html. Without
 *    that the h1 was reported at line 74 when it lives at line 754.
 */
const blankOut = (s) => s.replace(/[^\n]/g, '');

export function stripNonCopy(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blankOut)
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      (whole, attrs) => (/ld\+json/i.test(attrs) ? whole : blankOut(whole)))
    .replace(/<style\b[\s\S]*?<\/style>/gi, blankOut);
}

/* Line numbers make a failure actionable. Everything below reports them, so
   the message names the place rather than only the rule. */
export function locate(html, re) {
  const hits = [];
  const lines = html.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      hits.push({ line: i + 1, match: m[0], text: line.trim() });
    }
  });
  return hits;
}

/* The surfaces the rules actually govern. CLAUDE.md scopes the deficit-framing
   ban to "any headline, tagline, or CTA" - and share metadata belongs with
   them, because og:title is the headline a reader meets in Slack before they
   ever reach the page. */
export function headlines(html) {
  const copy = stripNonCopy(html);
  const out = [];
  for (const m of copy.matchAll(/<(h1|h2|h3)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    out.push({ where: `<${m[1]}>`, text: text(m[2]) });
  }
  return out;
}

export function ctas(html) {
  const copy = stripNonCopy(html);
  const out = [];
  for (const m of copy.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)) {
    out.push({ where: '<button>', text: text(m[1]) });
  }
  // Link CTAs are the ones carrying a btn- or nav-cta class.
  for (const m of copy.matchAll(/<a\b[^>]*class="[^"]*\b(?:btn-\w+|nav-cta|tool-link)\b[^"]*"[^>]*>([\s\S]*?)<\/a>/gi)) {
    out.push({ where: '<a> CTA', text: text(m[1]) });
  }
  return out;
}

export function shareMeta(html) {
  const out = [];
  const pick = (re, where) => {
    const m = html.match(re);
    if (m) out.push({ where, text: m[1] });
  };
  pick(/<title>([^<]*)<\/title>/i, '<title>');
  pick(/name="description" content="([^"]*)"/i, 'meta description');
  pick(/property="og:title" content="([^"]*)"/i, 'og:title');
  pick(/property="og:description" content="([^"]*)"/i, 'og:description');
  pick(/name="twitter:title" content="([^"]*)"/i, 'twitter:title');
  pick(/name="twitter:description" content="([^"]*)"/i, 'twitter:description');
  return out;
}

const text = (s) => s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

/* ---------------------------------------------------------------------------
   The rules
   --------------------------------------------------------------------------- */

/* "can't", "cannot" and "don't" name what the reader lacks. CLAUDE.md retires
   the framing outright: "The back office your school can't afford to hire" is
   the line this exists to keep from coming back. Scoped to headlines, CTAs and
   share metadata - body copy may legitimately need a negative. */
export const DEFICIT_WORDS = /\b(can'?t|cannot|couldn'?t|won'?t afford|unable to)\b/gi;

/* "deserves" names what the reader is owed rather than the value delivered.
   CLAUDE.md rules out both framings by name. */
export const ENTITLEMENT_WORDS = /\bdeserve[sd]?\b/gi;

/* An em dash never survives the house style. CLAUDE.md: "no em dashes in
   generated copy". A hyphen or a full stop does the job. */
export const EM_DASH = /—/g;

/* A count of schools we do not have is the fastest way to lose a founder who
   knows the sector. CLAUDE.md: "no fake user counts".
 *
 * Deliberately narrow. An earlier draft also triggered on "over" and "more
 * than", which fired on "Last summer we met over 100 school founders" in the
 * founder's quote - a true sentence about people met, not a usage claim. Only
 * verbs that assert adoption count. */
export const USER_COUNT = /\b(?:join(?:ed|s)?|trusted by|used by|loved by|serving)\s+(?:over\s+|more than\s+)?[\d,]+\+?\s+(?:schools?|founders?|leaders?|users?|customers?)\b/gi;

/* The clause CLAUDE.md requires wherever numbers appear. Matched on the
   load-bearing half rather than the full sentence: the page says "Estimates in
   our tools are for planning only..." while CLAUDE.md quotes "Estimates are
   for planning only...", and the footer wraps the sentence across two lines,
   so an exact substring match fails on whitespace alone. */
export const DISCLAIMER = /are for planning only and are not loan eligibility/i;

/* The debt this repo carries today. Lower these numbers when the copy changes;
   the check fails the moment one rises. Never raise one to make a run green -
   that is the whole point of the ratchet. */
export const KNOWN_DEBT = {
  // "deserves" on 8 lines: 4 share-metadata fields, the h1, the hero subtitle,
  // and the "School data deserves real care" FAQ answer in both its copies
  // (visible and JSON-LD, which must stay identical to each other).
  entitlement: 8,
};

/**
 * Every voice fault on the page, plus the outstanding debt.
 *
 * Returns { faults, debt } where faults are hard failures and debt is the
 * grandfathered set, reported on every run so it stays visible.
 */
export function voiceFaults(html) {
  const faults = [];
  const copy = stripNonCopy(html);
  const surfaces = [...headlines(html), ...ctas(html), ...shareMeta(html)];

  for (const s of surfaces) {
    for (const m of s.text.matchAll(DEFICIT_WORDS)) {
      faults.push(`${s.where} says "${m[0]}" ("${s.text}") - CLAUDE.md retires deficit framing in a headline, tagline or CTA`);
    }
  }

  for (const hit of locate(copy, EM_DASH)) {
    faults.push(`line ${hit.line} carries an em dash - CLAUDE.md forbids them in copy`);
  }

  for (const hit of locate(copy, USER_COUNT)) {
    faults.push(`line ${hit.line} claims "${hit.match}" - CLAUDE.md forbids invented user counts`);
  }

  /* Whitespace-normalised: the footer wraps this sentence across two lines. */
  if (!DISCLAIMER.test(html.replace(/\s+/g, ' '))) {
    faults.push('the planning-only disclaimer is gone; CLAUDE.md keeps it wherever numbers appear: "Estimates are for planning only and are not loan eligibility"');
  }

  /* The ratchet. Report every instance so the debt is legible, and fail only
     when the count grows past what was recorded. */
  const debt = locate(copy, ENTITLEMENT_WORDS);
  if (debt.length > KNOWN_DEBT.entitlement) {
    faults.push(
      `entitlement framing ("deserves") is on ${debt.length} lines, up from the recorded ${KNOWN_DEBT.entitlement}. ` +
      'CLAUDE.md retires it; do not raise KNOWN_DEBT to get green.');
  }

  return { faults, debt };
}
