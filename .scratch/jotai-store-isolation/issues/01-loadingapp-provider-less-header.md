# 01 — RESEARCH: Header reads the jotai default store inside LoadingApp

**Type:** Research (investigate and decide, do not implement yet)

**What to build:** A decision on how `Header` should resolve its jotai atoms when it renders under `LoadingApp`. Today `Header` reads `syncStatusAtom` and `usePrice()` (`priceViewAtom`). Under `LoadedApp` it reads the per-instance `controllerStore` through `<Provider>`. Under `LoadingApp` (import-UFVK and new-seed screens) there is no jotai `<Provider>`, so per the jotai docs those reads fall to the process-global default store ("provider-less mode"). Same component, two stores, chosen by tree position. The finding is latent, not firing: nothing in production writes the default store, so it stays at atom defaults (blank sync, unpriced), which is the correct onboarding display. The research decides whether to close the isolation hole and how.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

## Questions to answer

- [ ] Confirm the two render paths: `Header` under `LoadingApp` (via the import-UFVK and new-seed screens) reads the global default store, and under `LoadedApp` reads `controllerStore`. Cite the exact call sites.
- [ ] Confirm nothing in production writes the default store: no `getDefaultStore`, no provider-less `useSetAtom`, every container write targets `controllerStore`. State whether that invariant is enforced or merely current.
- [ ] Decide the fix shape. Options to weigh: (a) wrap the `LoadingApp` subtree in a `<Provider>` (bare or with a store field) so onboarding gets an isolated, remount-clean store; (b) give `Header` an explicit onboarding variant prop so its sync/price widgets are inert by intent, not by a missing Provider; (c) accept and document the current behaviour with a guard against future default-store writes.
- [ ] Check for the same defect elsewhere: any other jotai consumer that can mount outside a `<Provider>`. The known-clean set inside `LoadedApp` is `HomeStackBody`, `AddTagModalSlice`, and the options-panel host, all within the Provider subtree.
- [ ] Recommend one option and record why. Output is a decision plus, if warranted, a follow-up build ticket — not a code change in this ticket.

## Notes

- Jotai docs, provider-less mode: "If an atom is used in a tree without a Provider, it will use the default state." Verified against `/pmndrs/jotai`.
- Severity as found: latent robustness gap, not a live bug. It breaks the per-instance reset guarantee and is fragile against any future default-store write.
