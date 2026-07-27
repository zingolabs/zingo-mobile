// The report returned by zingolib's `execute_due_parts` (native
// `executeDuePartsProcess`) after a phase-2 scheduled batch is sent.
// Denominations are in zatoshis.
//
// Each part resolves to exactly one outcome, in send order:
//   sent     -> accepted by the broadcast endpoint (`txid`).
//   slid     -> its window boundary is no longer witnessable; reconciliation
//               carries it to a coming window, nothing is lost.
//   not_due  -> its window has not opened yet (`window_opens_unix_time`).
//   failed   -> submission failed and the batch halted here.
//
// `halted` is the error that stopped the batch early (null when it ran to
// completion); parts without an outcome entry were not attempted and remain
// due. `error` marks an infrastructure failure (offline, no migration) where
// no batch ran at all.
type RPCPartSendResultType =
  | { kind: 'sent'; txid: string }
  | { kind: 'slid' }
  | { kind: 'not_due'; window_opens_unix_time: number }
  | { kind: 'failed'; error: string };

type RPCPartOutcomeType = {
  part: number;
  denomination: number;
  result: RPCPartSendResultType;
};

export type RPCBatchReportType = {
  outcomes?: RPCPartOutcomeType[];
  halted?: string | null;
  error?: string;
};
