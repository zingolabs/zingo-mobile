# Excise zcashd by removing the regchest test backend

zcashd is dead, and the only functional zcashd path left in this repository was
the `regchest` cargo feature: an alternative arm in each integration and e2e
test that launched the `zingodevops/regchest` docker container, whose image
ships `zcashd`, `zcash-cli`, and `lightwalletd` and has no zebrad mode. We
removed the regchest integration entirely — the `regchest_utils` dependency,
the `regchest` features on the `rustandroid` and `rustios` crates, the gated
arms in the test suites, and the workflow and README references. Every test
now provisions its network exclusively through the default arm:
`zingolib_testutils` scenarios driving `zcash_local_net` to launch a native
zebrad validator and lightwalletd indexer, which is what gating CI already ran.

## Considered options

Porting regchest to zebrad + zainod was rejected because it amounts to
rebuilding regchest: its orchestration would be rewritten around
`zcash_local_net`, and every cached chain scenario would need regeneration
because zcashd chain state is meaningless to zebrad. Keeping the feature flag
dormant until such a rebuild was rejected because it ships a permanently
broken flag. The services regchest uniquely provided (a macOS-friendly
whole-network container and pre-baked funded chain state) have living
equivalents in the zaino repository's patterns (a containerized test runner
and `zcash_local_net` chain caches) that can be adopted as separate, additive
work if a need appears.

## Consequences

The tests lose their only alternative network backend until the darkside
harness (built on the auzum197/lightwallet-tools crates) inherits the vacated
feature-gated seam. Darkside fabricates and verifies nothing, so
real-validator coverage remains the zebrad default arm's job; on macOS hosts
zebrad is a Zebra Tier 3 platform (build-it-yourself, no upstream guarantee),
and if it ever regresses there, darkside fidelity is certified against zebrad
on Linux runners rather than by resurrecting a zcashd container.
