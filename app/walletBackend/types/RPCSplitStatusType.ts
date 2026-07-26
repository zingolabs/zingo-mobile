// A snapshot of the in-flight Phase 1 splitting round, as returned by zingolib's
// `split_status` (native `splitStatusProcess`). `null` from the native call
// means no round is running (before it starts, or once it has finished);
// otherwise the counts are 0..=total and advance as the round builds then
// broadcasts. The Phase 1 mirror of RPCDrainStatusType.
export type RPCSplitStatusPhase = 'building' | 'transmitting';

export type RPCSplitStatusType = {
  // Transactions in this round (N), fixed for the round.
  total: number;
  // Transactions proved + signed so far, 0..=total.
  built: number;
  // Transactions broadcast so far, 0..=total.
  sent: number;
  // Which phase the round is in: proving/signing, then broadcasting.
  phase: RPCSplitStatusPhase;
};
