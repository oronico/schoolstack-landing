# 0001. No code comments

Status: accepted, 22 November 2026.

## Context

On 22 November 2026 the repo held 676 comments over about 1,500 lines in
50 files. Each was read against the code beside it:

| Kind | Count | What happened to it |
| --- | --- | --- |
| Decision record | 455 | Moved into ADRs 0002 to 0017 |
| Tautology | 195 | Deleted |
| Stale | 21 | Deleted |
| Excuse | 12 | Deleted, and the shortcut filed as an issue |

Nothing checks a comment, so comments drift. Beyond the 21 stale ones, many
decision records were partly wrong: counts that had grown ("three checks",
"four outcomes"), a function that no longer exists, a class nothing uses.
And an excuse makes a shortcut look settled, so the next change copies it.

## Decision

1. Code carries no comments. That covers JavaScript, CSS and HTML (inline
   `<script>` and `<style>` included), YAML, TOML, Gherkin, and the Netlify,
   robots, security.txt and git config files. A shebang is not a comment.
2. Each kind of text has its own home:
   - why the code is the way it is: an ADR in `docs/adr/`, one per topic,
     naming the file and function each decision governs;
   - a rule every change must follow: `CLAUDE.md`;
   - why a check failed: the check's own failure message;
   - what a test holds: the test's name;
   - a known shortcut: a GitHub issue.
3. `tools/lib/comments.mjs` finds comments. It reads strings, template
   literals, regex literals and inline scripts and styles, so a `//` inside
   a URL or a regex does not count. It needs no parser package, because
   Cucumber stays the only dependency (CLAUDE.md §3). Its results matched
   acorn's on every file in the repo.
4. A ratchet holds the line. `COMMENT_DEBT` in `tools/lib/comments.mjs`
   records how many comments each file may carry; a file it does not list
   may carry none. `verify-content` fails when a count rises, and also when
   it falls but the recorded number stays the same, so the gain cannot be
   spent in another file. Never raise a number to get green.
5. One comment stays: the header of `fonts/fonts.css`. It says the file is
   generated and names the font licence (SIL OFL 1.1). `tools/fetch-fonts.mjs`
   writes it, so removing it means changing that template too.
6. The `/delete-comment` skill (`.claude/skills/delete-comment/SKILL.md`)
   repeats this sort for any comment that comes back.

## Consequences

- The change shed 1,514 lines. Another 46 lines lost a trailing comment
  but kept their code.
- A reason now sits one step from its code. Search the ADRs for the file
  or function name.
- The twelve excuses became seven issues, #68 to #74. #75 came from a
  decision record the code no longer meets: one copy of the browser
  start-up code, where there are now three.
- Section headers and labels that only named the next block are gone.
  Names and file layout carry that job.
