// The private migration's progress, as returned by zingolib's
// `migration_status` (native `migrationStatusProcess`), arranged for direct
// rendering. Values in zatoshis, heights in blocks, times in unix seconds.

type RPCMigrationPhaseType = {
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
// `window_opens_unix_time` (the boundary, where proof material is captured)
// and the user-facing reminder at `latest_target_unix_time` (when every part
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
  window_opens_unix_time: number;
  latest_target_unix_time: number;
};

// The batch the user can broadcast right now: the window the chain is
// currently inside, plus any overdue parts folded in. `upcoming_windows` carries
// only future windows and structurally cannot hold this one, so the "send
// batch" action reads it from here. `denominations` align element-for-element
// with `part_ids`, both in the window's broadcast order.
type RPCDueBatchType = {
  // The current bucket's opening boundary (the parts' anchor height).
  boundary: number;
  part_ids: number[];
  // Denominations (zatoshis), one per part_id.
  denominations: number[];
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
  // Window length in blocks (144 provisionally).
  bucket_modulus: number;
  upcoming_windows: RPCWakePointType[];
  // The batch broadcastable this instant (the window the chain is inside), or
  // null when a send now would build nothing (no migration, wrong phase, every
  // part still ahead of its random target, or all parts confirmed).
  due_now: RPCDueBatchType | null;
  error?: string;
};
