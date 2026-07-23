// A snapshot of the in-flight immediate Orchard -> Ironwood drain, as returned
// by zingolib's `drain_status` (native `drainStatusProcess`). `null` from the
// native call means no drain is running (before it starts, or once it has
// finished); otherwise the counts are 0..=total and advance as the drain
// builds then broadcasts.
export type RPCDrainStatusPhase = 'building' | 'transmitting';

export type RPCDrainStatusType = {
  // Total transactions in the plan (N), fixed for the whole drain.
  total: number;
  // Transactions proved + signed so far, 0..=total.
  built: number;
  // Transactions broadcast so far, 0..=total.
  sent: number;
  // Which phase the drain is in: proving/signing, then broadcasting.
  phase: RPCDrainStatusPhase;
};
