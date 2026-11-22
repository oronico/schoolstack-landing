# 0011. The early list form

Status: accepted. Recorded 22 November 2026 from code comments (ADR 0001).

## Context

The early list is the site's one sign-up, a Netlify form named
`early-access`. Its failures are silent: if the hidden `form-name` stops
matching the form, Netlify answers 200 and drops the sign-up.
(CLAUDE.md §5, §8)

## Decisions

1. The form in `index.html` is a four-state machine: `idle`, `submitting`,
   `failed`, `submitted`. `VIEW[state]` fixes everything visible, so the
   error and the thank-you can never show together. `ON[state]` lists the
   events each state answers, and `send()` ignores any other, as xstate/fsm
   does. The state is written to `#signup[data-state]`, which verify-form
   and the feature steps read. (CLAUDE.md §8)
2. Only `idle` and `failed` answer `SUBMIT`, so a second Enter while a
   request is out does nothing; the submit handler returns when
   `send('SUBMIT')` is refused. (CLAUDE.md §8)
3. The form, error and thank-you panel are shown and hidden with `hidden`.
   `.signup-form` sets `display: grid`, which beats `[hidden]`, so
   `css/site.css` restores `display: none` for all three. (CLAUDE.md §8)
4. The script reads the submit button's label from the markup at load, so
   relabelling the button in HTML cannot leave the error path putting back
   an old label.
5. Every failure, a server rejection or a request that never left the
   device, shows one written message: the answers are kept, and there is a
   person to email. The browser's own wording ("Failed to fetch") is never
   shown; it once hid the friendly text and the support address.
   verify-form fails if browser wording appears.
6. The error says "Your answers are still here", so verify-form checks that
   every typed answer is still in the form after a failed submit. Change
   the two together.
7. `writeError()` builds the message with DOM calls, not `innerHTML`, so it
   stays safe if a server message is ever shown there.
8. A hidden `bot-field` honeypot (`netlify-honeypot="bot-field"`) stays. It
   is hidden from every visitor and from assistive tech, so only a bot that
   fills every field trips it. It is not unused.
9. The footer's "Stay ready." block on every page links to `/#early-access`.
   There is no second form; the footer's `mailing-list` form was retired in
   November 2026. (CLAUDE.md §5)
10. `tools/verify-form.mjs` reads the Netlify contract off the rendered form,
    then drives success, server error, network drop, a request in flight,
    retry and an empty form.
