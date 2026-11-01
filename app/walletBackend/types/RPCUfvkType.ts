export type RPCUfvkType = {
  ufvk?: string;
  birthday?: number;
  birthday_adjusted_from?: number;
  // The wallet's own chain ("main" / "test" / "regtest"), surfaced by the
  // native layer so it is known even Offline.
  chain_name?: string;
};
