---
status: accepted
---

# Shield and self-send change outputs prefer the Ironwood pool

Once the Ironwood network upgrade (NU6.3 of the Zcash chain) has activated, the wallet directs shielding
transactions and the change portion of self-sends into the Ironwood shielded value pool rather than the
Orchard pool. This is the wallet's privacy path: value migrates toward the newest pool as a side effect
of ordinary operations, without a distinct "migration" transaction the chain could distinguish. We accept
that balances drift out of Orchard over time and that pre-Ironwood balance expectations (in tests and in
user-facing pool breakdowns) change; keeping change in Orchard would preserve those expectations but
would strand value in the older pool and make deliberate migrations stand out on chain.

## Consequences

- Integration-test ledgers must model the post-activation pool distribution; the
  `ExecuteSaplingBalanceFromSeed` expectations were updated for this on 2026-07-22 (ironwood 430 000,
  orchard 260 000, sapling 125 000, transparent 0 for the standard funded regtest scenario).
- Any transaction the wallet authors on an ironwood-activated chain must use the Ironwood consensus
  branch ID; the receive/scan path is unaffected. (An incorrect-branch-id defect in the authoring path
  was open when this was recorded.)
