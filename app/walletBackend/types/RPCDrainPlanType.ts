// The plan returned by zingolib's `plan_orchard_drain` (the immediate
// Orchard -> Ironwood migration path). Pure preview: nothing is signed or
// broadcast. All values are in zatoshis.
export type RPCDrainTxType = {
  // Values of the Orchard notes this transaction spends.
  inputs: number[];
  // Value of the single Ironwood output (no change).
  output: number;
  // Implied fee: sum(inputs) - output.
  fee: number;
};

// One resolved broadcast target the migrate-now drain may submit through: the
// eligible candidate set after sync-operator exclusion.
export type RPCBroadcastTargetType = {
  uri: string;
  // The accumulating-party key used for exclusion (the host's operator domain).
  operator: string;
  // Whether the target answered over the mixnet, or null until probed.
  reachable_over_mixnet: boolean | null;
};

export type RPCDrainPlanType = {
  // The transactions to build, each independent of the others. Empty when
  // there is nothing worth migrating.
  transactions?: RPCDrainTxType[];
  // Total value that will land in the Ironwood pool.
  migrated?: number;
  // Total fees across every transaction.
  fee?: number;
  // Value left behind in the Orchard pool because moving it is not worthwhile.
  residual?: number;
  // The servers the drain will broadcast through, sync operator excluded.
  broadcast_targets?: RPCBroadcastTargetType[];
  error?: string;
};
