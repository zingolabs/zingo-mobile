# The price surface has no manual fetch

The price surface used to start on a user tap: in advanced mode the first
tap raised a confirm dialog, and that gesture was the consent for all
later price traffic. We removed the tap entirely. Selecting Nym (the
persisted Mixnet Mode opt-in) is now the single and only consent for
price traffic, the surface is display-only, and no fetch failure raises a
snackbar. Staleness is the only failure signal: a price older than the
cadence's longest draw plus one fetch bound (ten minutes and thirty
seconds) dims, and recovery arrives from the refresh timer or the ready
follow-up, never from a gesture.

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
tick or the ready follow-up. Auto-refresh arms whenever the wallet
session holds the Nym selection in the foreground. A wallet without that
selection emits no price traffic at all: its USD rows render without a
fetched value, and enabling Mixnet Mode is what turns the price surface
on. Consent alone is also not enough where no market exists: offline
mode and non-mainnet chains never fetch, since no usable ZEC/USD price
exists for them.

The consented cadence is fixed: turning the Nym selection on fetches at
once, and so do a boot and every return from the background whose
foreground gate opens. Each further fetch follows the last at a uniform
random delay of five to ten minutes. Traffic follows the consent, never
the display: a wallet showing ZEC amounts fetches on the same cadence as
one showing USD, so the price is warm whenever the display wants it and
the traffic pattern reveals nothing about what the user looks at.
