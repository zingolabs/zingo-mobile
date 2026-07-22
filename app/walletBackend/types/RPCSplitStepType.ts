// What one `continue_note_splitting` call did (native
// `continueNoteSplittingProcess`). The splitting loop matches on `step`:
// sync between calls and keep going until `splitting_complete`.
export type RPCSplitStepKind =
  | 'round_broadcast'
  | 'awaiting_confirmation'
  | 'splitting_complete';

export type RPCSplitStepType = {
  step?: RPCSplitStepKind;
  // round_broadcast: the round just sent, counted from zero.
  round?: number;
  // round_broadcast: its transactions. Sync until they confirm, then call
  // again.
  txids?: string[];
  // awaiting_confirmation: transactions still in flight. An empty list means
  // every transaction confirmed but the anchor has not reached the round's
  // outputs yet. Either way: sync and call again; nothing was written.
  pending?: string[];
  error?: string;
};
