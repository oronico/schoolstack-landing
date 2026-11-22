# 0014. Legal pages match the code

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Decisions

1. Every statement in `privacy.html` is a fact about the code. verify-content
   holds it there: each field a form in `FORMS` submits must be listed under
   that form's `data-form` list, no listed field may be stale, and no page,
   script or `_headers` may use cookies. The CSP forbids outside scripts.
   Change the site and the policy together, and have counsel review
   material changes. (CLAUDE.md §7)
2. `terms.html` describes only what the site and tools do. It says nothing
   on governing law or on who holds the rights: counsel and the owner must
   state those, and the page awaits legal review.
