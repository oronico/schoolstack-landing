const blankOut = (s) => s.replace(/[^\n]/g, '');

export function stripNonCopy(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, blankOut)
    .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
      (whole, attrs) => (/ld\+json/i.test(attrs) ? whole : blankOut(whole)))
    .replace(/<style\b[\s\S]*?<\/style>/gi, blankOut);
}

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

export const DEFICIT_WORDS = /\b(can'?t|cannot|couldn'?t|won'?t afford|unable to)\b/gi;

export const ENTITLEMENT_WORDS = /\bdeserve[sd]?\b/gi;

export const EM_DASH = /—/g;

export const BETA = /\bbeta\b/gi;

export const ACCESS_CLAIM = /\b(?:get early access|early access (?:is )?(?:now )?open)\b/gi;

export const USER_COUNT = /\b(?:join(?:ed|s)?|trusted by|used by|loved by|serving)\s+(?:over\s+|more than\s+)?[\d,]+\+?\s+(?:schools?|founders?|leaders?|users?|customers?)\b/gi;

export const RETIRED_CLAIMS = [
  { re: /what space fits my school/gi, why: 'Space sizes the space a school needs; it gives no verdict on a building' },
  { re: /ranked by their effect on enrollment/gi, why: 'the audit ranks by its own weights, not measured effects' },
  { re: /adds categories that help with Form 990/gi, why: 'the owner\'s guidance is to review whether Advanced helps with Form 990' },
  { re: /organizations,? and the local zoning office/gi, why: 'Space gives a web search for the zoning office, not the office itself' },
];

export function retiredClaimFaults(text) {
  const faults = [];
  for (const { re, why } of RETIRED_CLAIMS) {
    for (const hit of locate(text, re)) {
      faults.push(`line ${hit.line} says "${hit.match}" - retired by docs/claims-standard.md: ${why}`);
    }
  }
  return faults;
}

export const DISCLAIMER = /are for planning only and are not loan eligibility/i;

export const KNOWN_DEBT = {
  entitlement: 0,
};

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

  for (const hit of locate(copy, BETA)) {
    faults.push(`line ${hit.line} says "${hit.match}" - CLAUDE.md: say "early access", never "beta" or "closed beta"`);
  }

  for (const hit of locate(copy, ACCESS_CLAIM)) {
    faults.push(`line ${hit.line} says "${hit.match}" - early access is not open yet; say "Sign up for early access" (owner, November 2026)`);
  }

  faults.push(...retiredClaimFaults(copy));

  for (const hit of locate(copy, USER_COUNT)) {
    faults.push(`line ${hit.line} claims "${hit.match}" - CLAUDE.md forbids invented user counts`);
  }

  if (!DISCLAIMER.test(html.replace(/\s+/g, ' '))) {
    faults.push('the planning-only disclaimer is gone; CLAUDE.md keeps it wherever numbers appear: "Estimates are for planning only and are not loan eligibility"');
  }

  const debt = locate(copy, ENTITLEMENT_WORDS);
  if (debt.length > KNOWN_DEBT.entitlement) {
    faults.push(KNOWN_DEBT.entitlement === 0
      ? `entitlement framing ("deserves") is back, on line(s) ${debt.map((d) => d.line).join(', ')}. `
        + 'CLAUDE.md retires it: name the value received, not what the reader is owed.'
      : `entitlement framing ("deserves") is on ${debt.length} lines, up from the recorded ${KNOWN_DEBT.entitlement}. `
        + 'CLAUDE.md retires it; do not raise KNOWN_DEBT to get green.');
  }

  return { faults, debt };
}
