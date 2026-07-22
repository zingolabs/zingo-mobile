// The launch-time reconciliation report from zingolib's `reconcile_migration`
// (native `reconcileMigrationProcess`). Safe actions were already applied
// unattended; the app-facing ones are:
//   continue_note_splitting / retry_split  -> drive the splitting loop
//   await_split_confirmation               -> sync first, reconcile again
//   prompt_catch_up                        -> folded into the next execute tap
//                                             (manual mode needs no prompt)
//   replan_remainder                       -> fresh consent required
// The rest (promote_confirmed, rebuild, mark_invalidated, mark_complete)
// report what was applied.
export type RPCReconcileActionKind =
  | 'await_split_confirmation'
  | 'retry_split'
  | 'continue_note_splitting'
  | 'promote_confirmed'
  | 'rebuild'
  | 'mark_invalidated'
  | 'replan_remainder'
  | 'prompt_catch_up'
  | 'mark_complete';

export type RPCReconcileActionType = {
  action: RPCReconcileActionKind;
  // retry_split: the failed transaction.
  txid?: string;
  // promote_confirmed / rebuild / mark_invalidated: the part.
  part?: number;
  // prompt_catch_up: the overdue parts.
  parts?: number[];
  // mark_complete: the unmigrated leftover, in zatoshis.
  residual?: number;
};

export type RPCReconcileType = {
  actions?: RPCReconcileActionType[];
  error?: string;
};
