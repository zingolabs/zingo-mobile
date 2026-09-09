export type RPCUfvkType = {
  ufvk?: string;
  birthday?: number;
  // The wallet's own chain ("main" / "test" / "regtest"), surfaced by the
  // native layer so it is known even Offline.
  chain_name?: string;
};
