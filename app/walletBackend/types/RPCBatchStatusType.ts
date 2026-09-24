// A snapshot of the in-flight phase-2 execute batch, as returned by zingolib's
// `execute_due_parts_status` (native `executeDuePartsStatusProcess`). `null`
// from the native call means no batch is running (before it starts, or once it
// has finished); otherwise the counts are 0..=total and advance as the batch
// proves, submits, then waits out the spacing before the next part.
export type RPCBatchStatusPhase = 'sending' | 'spacing';

export type RPCBatchStatusType = {
  // Parts owed this batch (N), fixed for the whole batch.
  total: number;
  // Parts resolved so far (sent, slid, or found not due), 0..=total.
  resolved: number;
  // Parts accepted by the broadcast endpoint so far, 0..=total.
  sent: number;
  // Which phase the batch is in: proving/submitting, then spacing.
  phase: RPCBatchStatusPhase;
};
