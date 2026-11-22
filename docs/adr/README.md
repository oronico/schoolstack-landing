# Architecture decision records

Why the code is the way it is. The code carries no comments (ADR 0001), so a
reason that would once have sat above a line of code lives here, under its
topic, naming the file and function it governs. Rules every change must
follow stay in `CLAUDE.md`; where an ADR repeats one, it cites the section.

| ADR | Topic |
| --- | --- |
| [0001](0001-no-code-comments.md) | No code comments, and the ratchet that holds it |
| [0002](0002-static-site-no-build.md) | A static site with no build step |
| [0003](0003-ci-workflow.md) | The CI workflow |
| [0004](0004-self-hosted-fonts.md) | Self-hosted brand fonts |
| [0005](0005-csp-and-headers.md) | Security headers and the CSP |
| [0006](0006-redirects-and-click-counts.md) | Redirects and click counts |
| [0007](0007-stable-names.md) | Stable names, versions and anchors |
| [0008](0008-layout-scales-and-tokens.md) | Layout, scales and colour tokens |
| [0009](0009-accessibility.md) | Accessibility |
| [0010](0010-copy-rules.md) | Copy rules in code |
| [0011](0011-early-list-form.md) | The early list form |
| [0012](0012-calculator-math.md) | Calculator math |
| [0013](0013-enrollment-audit-model.md) | Enrollment Audit's model |
| [0014](0014-legal-pages.md) | Legal pages match the code |
| [0015](0015-image-pipeline.md) | The image pipeline |
| [0016](0016-browser-checks-harness.md) | The browser checks and their harness |
| [0017](0017-test-approach.md) | How the tests are built |

To add a decision, put it under the ADR whose topic it belongs to. Start a
new ADR only for a topic none covers: take the next number and add it to
this table. When a decision changes, edit its entry; git keeps the history.
