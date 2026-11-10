import { ValueTransferType, ValueTransferStatus } from '@app/wallet/transfer';
import {
  failedSince,
  followTxids,
  followsHere,
} from '@screens/Computing/sendProgress';

const row = (
  txid: string,
  status: ValueTransferStatus,
  confirmations = 0,
  kind = 'Sent',
  time = 100,
): ValueTransferType =>
  ({ txid, kind, status, confirmations, time }) as ValueTransferType;

describe('followTxids', () => {
  test('Tests that a send is through NYM when its transaction is not listed yet.', () => {
    expect(followTxids(['a'], [])).toMatchObject({
      kind: 'progress',
      step: 'nym',
    });
  });

  test('Tests that a send is through NYM when its transaction is calculated.', () => {
    expect(followTxids(['a'], [row('a', 'calculated')])).toMatchObject({
      step: 'nym',
    });
  });

  test('Tests that a TEX send confirms by its least confirmed transaction when both are mined.', () => {
    expect(
      followTxids(
        ['a', 'b'],
        [row('a', 'confirmed', 3), row('b', 'confirmed', 1)],
      ),
    ).toMatchObject({ step: 'conf', confirmations: 1 });
  });

  test('Tests that a send is done when it has the minimum confirmations.', () => {
    expect(followTxids(['a'], [row('a', 'confirmed', 3)])).toMatchObject({
      step: 'done',
    });
  });

  test('Tests that a send with no txids is done when the backend named none.', () => {
    expect(followTxids([], [])).toMatchObject({ step: 'done' });
  });

  test('Tests that a send expired, partly, when one of its two transactions failed.', () => {
    expect(
      followTxids(['a', 'b'], [row('a', 'confirmed', 2), row('b', 'failed')]),
    ).toMatchObject({ kind: 'failed', stage: 'expired', partial: true });
  });
});

describe('failedSince', () => {
  test('Tests that a send failed while creating has no transactions when failed rows exist.', () => {
    expect(failedSince('create', 0, [row('a', 'failed')])).toMatchObject({
      rows: [],
      partial: false,
    });
  });

  test('Tests that a send failed while sending finds its own rows since its attempt, the hop first.', () => {
    const hop = row('hop', 'failed', 0, 'SendToSelf');
    const pay = row('pay', 'failed');
    const view = failedSince('send', 50, [
      pay,
      row('old', 'failed', 0, undefined, 10),
      row('in', 'mempool', 0, 'Received'),
      hop,
    ]);
    expect(view.rows).toEqual([hop, pay]);
    expect(view).toMatchObject({ partial: false });
  });
});

describe('followsHere', () => {
  test('Tests that a send reopens on the sending screen when it is still confirming.', () => {
    expect(followsHere(row('a', 'confirmed', 2))).toBe(true);
  });

  test('Tests that a send opens its detail when it failed.', () => {
    expect(followsHere(row('a', 'failed'))).toBe(false);
  });

  test('Tests that a received transaction opens its detail when it is still confirming.', () => {
    expect(followsHere(row('a', 'mempool', 0, 'Received'))).toBe(false);
  });
});
