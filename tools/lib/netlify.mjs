/**
 * The pure logic behind the checks: Netlify's _headers format, its path
 * globbing, and what a Content-Security-Policy has to mean.
 *
 * These live here rather than inside verify-headers.mjs because a bug in any
 * of them does not make a check fail, it makes a check LIE. The header
 * verifier serves the site with whatever parseHeaders() and matches() decide,
 * so a parser that quietly drops a rule produces a page served without that
 * header, verified against a policy nobody applied, and reported green.
 *
 * Unit tested in tools/lib/netlify.test.mjs.
 */

/**
 * Parse Netlify's _headers: an unindented path pattern, then indented
 * `Key: value` lines until the next unindented line.
 */
export function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [] };
      rules.push(current);
    } else if (current) {
      // First colon only: a value may contain more of them, and CSP always does.
      const idx = line.indexOf(':');
      if (idx > 0) current.headers.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

/**
 * Netlify's path globbing: `*` stands for any run of characters, everything
 * else is literal. Regex metacharacters in the pattern are escaped, so a rule
 * for `/*.png` cannot accidentally match `/axpng`.
 */
export function matches(pattern, path) {
  const rx = new RegExp('^' + pattern.split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*') + '$');
  return rx.test(path);
}

/** Every header that applies to a path, later rules winning over earlier ones. */
export function headersFor(rules, path) {
  const headers = {};
  for (const rule of rules) {
    if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) headers[k] = v;
  }
  return headers;
}

/**
 * The CSP directives that carry the weight. A policy that loses one of these
 * is still a policy, still present, and no longer doing the job.
 */
export function cspFaults(value) {
  const directives = new Map(
    value.split(';').map((part) => part.trim().split(/\s+/)).filter(([n]) => n)
      .map(([name, ...vals]) => [name.toLowerCase(), vals]),
  );
  const faults = [];
  const wants = {
    'default-src': "'self'", 'base-uri': "'self'", 'form-action': "'self'",
    'object-src': "'none'", 'frame-ancestors': "'none'",
  };
  for (const [name, want] of Object.entries(wants)) {
    if (!directives.has(name)) faults.push(`${name} is missing`);
    else if (!directives.get(name).includes(want)) faults.push(`${name} does not include ${want}`);
  }
  for (const [name, vals] of directives) {
    // A wildcard or a plaintext origin anywhere undoes the rest of the policy.
    if (vals.includes('*')) faults.push(`${name} is a wildcard`);
    for (const v of vals.filter((x) => /^http:/i.test(x))) faults.push(`${name} allows plaintext ${v}`);
  }
  if (directives.get('script-src')?.includes("'unsafe-eval'")) faults.push("script-src allows 'unsafe-eval'");
  return faults;
}
