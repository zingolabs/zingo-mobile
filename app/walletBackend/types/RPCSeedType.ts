export type RPCSeedType = {
  seed_phrase?: string;
  birthday?: number;
  no_of_accounts?: number;
  // The wallet's own chain ("main" / "test" / "regtest"), surfaced by the
  // native layer so it is known even Offline.
  chain_name?: string;
  error?: string;
};
