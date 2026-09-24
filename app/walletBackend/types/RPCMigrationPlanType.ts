// The plan returned by zingolib's `plan_ironwood_migration` (the private,
// two-phase ZIP 318 path). Pure preview: nothing is signed or broadcast.
// All values are in zatoshis.

// One note-splitting transaction: an Orchard self-send that resizes notes.
export type RPCSplitTxType = {
  // Values of the Orchard notes this transaction spends.
  inputs: number[];
  // Values of the self-notes this transaction creates.
  outputs: number[];
  // Implied fee: sum(inputs) - sum(outputs).
  fee: number;
};

export type RPCMigrationPlanType = {
  // Note-splitting rounds, executed in order. Transactions within a round are
  // independent and broadcast together; each round's outputs must confirm
  // before the next round spends them. Empty when the notes are already
  // part-ready (no splitting needed).
  split_rounds?: RPCSplitTxType[][];
  // The denominations of the parts to send once splitting completes (largest
  // first). In UI copy each part is a "note".
  parts?: number[];
  // Total fees across all note-splitting transactions.
  split_fee?: number;
  // Total fees the parts will pay (one part fee per denomination).
  parts_fee?: number;
  // Value left behind because moving it costs more than it carries. Consent
  // must disclose this.
  residual?: number;
  // Consent hash of this exact plan (hex). Pass back unchanged to
  // startIronwoodMigration when the user accepts.
  plan_hash?: string;
  error?: string;
};
