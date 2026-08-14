---
status: accepted
---

# Shield and self-send change outputs prefer the Ironwood pool

After the Ironwood network upgrade (NU6.3) activates, the wallet directs shielding transactions and self-send change into the Ironwood shielded value pool, not Orchard. This is the privacy path: value migrates to the newest pool as a side effect of ordinary operations, with no separate "migration" transaction for the chain to single out.

We accept the cost. Balances drift out of Orchard over time, and pre-Ironwood balance expectations change, in tests and in user-facing pool breakdowns. Keeping change in Orchard would preserve those expectations, but it would strand value in the older pool and make deliberate migrations stand out on chain.

## Consequences

- Integration-test ledgers must model the post-activation distribution. The `ExecuteSaplingBalanceFromSeed` expectations were updated on 2026-07-22: ironwood 430 000, orchard 260 000, sapling 125 000, transparent 0 for the standard funded regtest scenario.
- Any transaction the wallet authors on an ironwood-activated chain must use the Ironwood consensus branch ID. The receive/scan path is unaffected.
