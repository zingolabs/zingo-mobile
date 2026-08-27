# The price surface has no manual fetch

The price surface used to start on a user tap: in advanced mode the first
tap raised a confirm dialog, and that gesture was the consent for all
later price traffic. We removed the tap entirely. Selecting Nym (the
persisted Mixnet Mode opt-in) is now the single and only consent for
price traffic, the surface is display-only, and no fetch failure raises a
snackbar. Staleness is the only failure signal: a price older than five
minutes of wall clock dims, and recovery arrives from the refresh timer
or the ready follow-up, never from a gesture.

We chose this because the tap carried most of the surface's complexity
(the confirm dialog, the cooldown and anti-spam gate, the idle and
spinner states, the error toasts), and because no other setting expresses
a real consent: USD is the seeded default currency, so it authorizes
nothing for a user who never chose it. The Nym selection is a deliberate
opt-in, default off and sticky, and over the mixnet the privacy exposure
of an unattended fetch is bounded by the Route rule: a fetch that
resolves to clearnet is refused, never sent.

## Considered options

Keeping the tap as a consent and recovery gesture, relocating the consent
dialog into the currency setting while dropping only the tap, and
treating USD selection as the consent were all rejected: the first
preserves the complexity this decision removes, the second keeps a second
consent point for a single setting, and the third is hollow for the
default case, since a fresh install carries USD without any choice.

## Consequences

A user cannot force a refresh: a stale price waits for the next timer
tick or the ready follow-up. Auto-refresh arms whenever a fetcher is
mounted in the foreground with the Nym selection held. A wallet without
that selection emits no price traffic at all: its USD rows render without
a fetched value, and enabling Mixnet Mode is what turns the price
surface on.
