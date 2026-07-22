// The private migration's progress, as returned by zingolib's
// `migration_status` (native `migrationStatusProcess`), arranged for direct
// rendering. Values in zatoshis, heights in blocks, times in unix seconds.

export type RPCMigrationPhaseType = {
  kind: 'planned' | 'note_splitting' | 'parts_scheduled' | 'complete';
  // note_splitting: the round currently awaiting confirmation (from zero).
  round?: number;
  // note_splitting: txids of that round's transactions.
  pending_txids?: string[];
  // complete: unmigrated value left in the Orchard pool (the residual
  // disclosure).
  residual?: number;
};

// One coming broadcast window. Two wakes per window: a silent sync near
// `estimated_unix_time` (the boundary, where proof material is captured) and
// the user-facing reminder at `estimated_target_unix_time` (when every part
// of the window is due).
export type RPCWakePointType = {
  bucket_index: number;
  // The window's opening boundary, also the parts' anchor height.
  boundary: number;
  // The parts due in this window.
  part_ids: number[];
  // Denominations (zatoshis) mirroring part_ids element-for-element — the
  // window's batch, ready to render.
  denominations: number[];
  estimated_unix_time: number;
  estimated_target_unix_time: number;
};

export type RPCMigrationStatusType = {
  // Confirmed-spendable balance left in the Orchard pool specifically.
  // ZIP 318 requires displaying this figure while a migration is in flight;
  // a unified balance alone is not compliant.
  orchard_confirmed_spendable: number;
  // Where the migration is; null when none is in progress.
  phase: RPCMigrationPhaseType | null;
  parts_total: number;
  parts_confirmed: number;
  value_total: number;
  value_migrated: number;
  // The effective cadence (parts per window); null when no migration exists.
  per_bucket: number | null;
  // Window length in blocks (256 provisionally).
  bucket_modulus: number;
  next_wakes: RPCWakePointType[];
  error?: string;
};
