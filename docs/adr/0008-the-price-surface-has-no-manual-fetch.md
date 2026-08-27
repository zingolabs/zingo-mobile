# The price surface has no manual fetch

The price surface used to start on a user tap: in advanced mode the first
tap raised a confirm dialog, and that gesture was the consent for all
later price traffic. We removed the tap entirely. Selecting USD as the
display currency is now the sole consent for price traffic, the surface
is display-only, and no fetch failure raises a snackbar. Staleness is the
only failure signal: a price older than five minutes of wall clock dims,
and recovery arrives from the refresh timer or the ready follow-up, never
from a gesture.

We chose this because the tap carried most of the surface's complexity
(the confirm dialog, the cooldown and anti-spam gate, the idle and
spinner states, the error toasts) while duplicating a consent the
currency setting already expresses. Over the mixnet the privacy exposure
of an unattended fetch is bounded by the Route rule: a fetch that
resolves to clearnet is refused, never sent.

## Considered options

Keeping the tap as a consent and recovery gesture, and relocating the
consent dialog into the currency setting while dropping only the tap,
were both rejected: the first preserves the complexity this decision
removes, and the second keeps a second consent point for a single
setting.

## Consequences

A user cannot force a refresh: a stale price waits for the next timer
tick or the ready follow-up. Auto-refresh arms whenever a fetcher is
mounted in the foreground with USD selected, including for users who
selected USD before this change.
