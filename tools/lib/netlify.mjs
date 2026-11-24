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
      const idx = line.indexOf(':');
      if (idx > 0) current.headers.push([line.slice(0, idx).trim(), line.slice(idx + 1).trim()]);
    }
  }
  return rules;
}

export function matches(pattern, path) {
  const rx = new RegExp('^' + pattern.split('*')
    .map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*') + '$');
  return rx.test(path);
}

export function headersFor(rules, path) {
  const headers = {};
  for (const rule of rules) {
    if (matches(rule.pattern, path)) for (const [k, v] of rule.headers) headers[k] = v;
  }
  return headers;
}

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
    if (vals.includes('*')) faults.push(`${name} is a wildcard`);
    for (const v of vals.filter((x) => /^http:/i.test(x))) faults.push(`${name} allows plaintext ${v}`);
  }
  if (directives.get('script-src')?.includes("'unsafe-eval'")) faults.push("script-src allows 'unsafe-eval'");
  if (directives.get('script-src')?.includes("'unsafe-inline'")) faults.push("script-src allows 'unsafe-inline'");
  return faults;
}
