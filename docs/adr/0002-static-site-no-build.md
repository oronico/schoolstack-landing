# 0002. A static site with no build step

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

Netlify publishes the repo root as it stands (`netlify.toml`: `publish = "."`).
What is committed is what ships, and every file in the repo has a public URL.

## Decisions

1. The site has no runtime dependency. `npm ci` installs dev tools only
   (Cucumber and acorn), and none of them reaches a browser, so the CSP can
   keep forbidding every outside origin. (CLAUDE.md §3)
2. `node_modules/` is gitignored, because a committed dependency tree would
   be served from the CDN. (CLAUDE.md §3)
3. `robots.txt` disallows the files that are reachable but are not pages:
   `/tools/`, `/features/`, `/node_modules/`, `/docs/`, `/.claude/`,
   `cucumber.mjs`, the package files and `LICENSE`. (CLAUDE.md §5)
4. `tools/og-image.html` carries `noindex, nofollow`: it is a render source
   for the share card, but Netlify serves it.
5. There is no templating, so the nav and footer are written out on
   `index.html`, `about.html`, `privacy.html` and `terms.html`. `pageChrome()`
   in `tools/lib/page-audit.mjs` ignores the two intended differences
   (`/#` links against `#` on the home page, and `aria-current="page"`), so
   `chromeDrift()` fails on any other. (CLAUDE.md, intro)
6. `verify-content.mjs` splits pages into `OTHER_PAGES`, which share the home
   page's nav and footer, and `TOOL_PAGES` (`enrollment/index.html`), which
   have their own masthead and skip `chromeDrift()` but meet the link,
   anchor, voice, asset and privacy rules. (CLAUDE.md, intro)
7. `verify-content.mjs` treats a clean URL such as `/about` as present when
   `about.html` exists, because Netlify serves it at that path.

## Consequences

- A new folder at the root is public. Add it to `robots.txt` if it is not
  a page.
