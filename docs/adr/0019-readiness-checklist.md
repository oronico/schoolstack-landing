# 0019. The readiness checklist

Status: accepted. Recorded 23 November 2026, when `ready.html` was added
(owner: yes to "a one-page Get ready for SchoolStack checklist").

## Context

`ready.html`, served at `/ready`, lists what a school gathers before its
first day on SchoolStack. The list is what onboarding asks a design partner
school for: QuickBooks Online, reconciled books, a chart of accounts that
separates income sources, a five-year budget, a roster with each student's
funding, last year's statements and the lease. The early access list had
nothing to do while it waited, and no page answered the founder question
"how do I get my books ready".

## Decisions

1. One page, one list of seven, each a heading and two or three sentences.
   No step times and no prompts: the giving guide's shape is for a campaign,
   this is a list to work through.
2. It shares the nav, footer and checks of the other pages, and the guide
   styles (`.guide-cards`, `.guide-note`). It adds no CSS.
3. It links from the footer's Resources column on every page and from the
   early list's thank-you panel, the moment a school has just asked to be
   ready.
4. It states only facts the site already states: QuickBooks Online is the
   system of record, Advanced is never required, nonprofits review it for
   Form 990 categories, and the accounting partner moves other platforms'
   books (unnamed, through allison@schoolstack.ai). Cash versus accrual
   stays off it, as everywhere on the site.
5. It reuses the site's share card rather than carrying its own.
6. Its close says what is true today: design partner schools use
   SchoolStack, and it opens to more schools in 2027.
7. Print uses its own named page (`@page ready`) with the guide print rules, so its footer and header name /ready, not /giving.
