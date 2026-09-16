/**
 * What the batch-sending screen shows after execute_due_parts. The case that
 * matters: zingolib reports a failed submission as `slid` with no `halted`
 * error, while the part's transaction already shows in History. A part this
 * send attempted that is still in `due_now` afterwards was not sent, and the
 * screen must say so instead of reporting success or "slid to a coming
 * window".
 */
import { deriveBatchVerdict } from '@screens/MigrationBatchSending/batchVerdict';
import {
  RPCBatchReportType,
  RPCPartSendResultType,
} from '@app/walletBackend/types/RPCBatchReportType';

const sent: RPCPartSendResultType = { kind: 'sent', txid: 'aa' };
const slid: RPCPartSendResultType = { kind: 'slid' };

const report = (
  ...results: Array<[number, RPCPartSendResultType]>
): RPCBatchReportType => ({
  outcomes: results.map(([part, result]) => ({
    part,
    denomination: 100000,
    result,
  })),
  halted: null,
});

describe('deriveBatchVerdict', () => {
  test('a call failure is a failure', () => {
    expect(deriveBatchVerdict('offline', null, null)).toEqual({
      kind: 'failed',
      message: 'offline',
    });
  });

  test('a halted batch is a failure, whatever is still due', () => {
    const halted = { ...report([1, sent]), halted: 'rejected' };
    expect(deriveBatchVerdict(null, halted, [2])).toEqual({
      kind: 'failed',
      message: 'rejected',
    });
  });

  test('an empty report means nothing was owed', () => {
    expect(deriveBatchVerdict(null, report(), [])).toEqual({
      kind: 'nothing',
    });
  });

  test('every part sent is a success', () => {
    expect(
      deriveBatchVerdict(null, report([1, sent], [2, sent]), null),
    ).toEqual({ kind: 'sent', sent: 2, total: 2 });
  });

  test('a "slid" part still due was never sent (failed submission)', () => {
    expect(
      deriveBatchVerdict(null, report([1, sent], [2, slid], [3, slid]), [2, 3]),
    ).toEqual({ kind: 'unsent', unsent: 2, total: 3 });
  });

  test('no part sent and all still due is unsent, not "slid"', () => {
    expect(deriveBatchVerdict(null, report([1, slid]), [1])).toEqual({
      kind: 'unsent',
      unsent: 1,
      total: 1,
    });
  });

  test('parts of a newly opened window in due_now do not count', () => {
    // Parts 7 and 8 belong to a window that opened while the batch proved;
    // this send never attempted them.
    expect(
      deriveBatchVerdict(null, report([1, sent], [2, sent]), [7, 8]),
    ).toEqual({ kind: 'sent', sent: 2, total: 2 });
  });

  test('slid parts no longer due really slid', () => {
    expect(deriveBatchVerdict(null, report([1, slid]), [])).toEqual({
      kind: 'not-sendable',
    });
    expect(deriveBatchVerdict(null, report([1, sent], [2, slid]), [])).toEqual({
      kind: 'sent',
      sent: 1,
      total: 2,
    });
  });

  test('an unreadable status falls back to the report alone', () => {
    expect(deriveBatchVerdict(null, report([1, slid]), null)).toEqual({
      kind: 'not-sendable',
    });
    expect(
      deriveBatchVerdict(null, report([1, sent], [2, slid]), null),
    ).toEqual({ kind: 'sent', sent: 1, total: 2 });
  });
});
