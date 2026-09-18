// Derives what the batch-sending screen shows once execute_due_parts returns.
// Pure and total.
//
// zingolib records a part's transaction in the wallet (it shows in History as
// pending) before submitting it, and a failed submission comes back as a
// `slid` outcome with no `halted` error: the part stays signed and due in the
// current window. The report alone therefore cannot tell "not built yet" from
// "built but never reached the network". The follow-up migration_status read
// can: a part this send attempted that is still in `due_now` was not sent.
import { RPCBatchReportType } from '@app/walletBackend/types/RPCBatchReportType';

export type BatchVerdict =
  // The call failed or the batch halted on a submission error.
  | { kind: 'failed'; message: string }
  // Some attempted parts are still due: they did not reach the network.
  | { kind: 'unsent'; unsent: number; total: number }
  // Nothing was owed.
  | { kind: 'nothing' }
  // Nothing could be built and nothing is still due (slid to a coming window).
  | { kind: 'not-sendable' }
  | { kind: 'sent'; sent: number; total: number };

// `dueNowPartIds` is `due_now.part_ids` read after the send: `[]` when nothing
// is due, `null` when that read was skipped or failed. With `null` the verdict
// falls back to the report alone, as before this check existed.
export function deriveBatchVerdict(
  failure: string | null,
  report: RPCBatchReportType | null,
  dueNowPartIds: number[] | null,
): BatchVerdict {
  if (failure || report?.halted) {
    return { kind: 'failed', message: failure ?? report?.halted ?? '' };
  }
  const outcomes = report?.outcomes ?? [];
  if (outcomes.length === 0) {
    return { kind: 'nothing' };
  }
  const sent = outcomes.filter(o => o.result.kind === 'sent').length;
  if (dueNowPartIds !== null) {
    // Only parts this send attempted count. A window that opened while the
    // batch was proving puts new parts in due_now; those were never tried.
    const unsent = outcomes.filter(
      o => o.result.kind !== 'sent' && dueNowPartIds.includes(o.part),
    ).length;
    if (unsent > 0) {
      return { kind: 'unsent', unsent, total: outcomes.length };
    }
  }
  if (sent === 0) {
    return { kind: 'not-sendable' };
  }
  return { kind: 'sent', sent, total: outcomes.length };
}
