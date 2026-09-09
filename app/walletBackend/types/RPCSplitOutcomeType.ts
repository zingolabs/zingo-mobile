// What one `quick_split` call did (native `quickSplitProcess`), ADR 0016. The
// stateless splitting loop matches on `outcome`: sync between calls and keep
// going until `complete`, then run startIronwoodMigration for Phase 2.
export type RPCSplitOutcomeKind =
  'round' | 'awaiting_confirmation' | 'complete';

export type RPCSplitOutcomeType = {
  outcome?: RPCSplitOutcomeKind;
  // round: the round just built and broadcast. Sync until they confirm, then
  // call again.
  txids?: string[];
  error?: string;
};
