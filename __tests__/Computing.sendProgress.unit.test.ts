import { ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import {
  failedSince,
  followTxids,
  followsHere,
} from '@screens/Computing/sendProgress';

const row = (
  txid: string,
  status: RPCValueTransfersStatusEnum,
  confirmations = 0,
  kind = ValueTransferKindEnum.Sent,
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
    expect(
      followTxids(['a'], [row('a', RPCValueTransfersStatusEnum.calculated)]),
    ).toMatchObject({ step: 'nym' });
  });

  test('Tests that a TEX send confirms by its least confirmed transaction when both are mined.', () => {
    expect(
      followTxids(
        ['a', 'b'],
        [
          row('a', RPCValueTransfersStatusEnum.confirmed, 3),
          row('b', RPCValueTransfersStatusEnum.confirmed, 1),
        ],
      ),
    ).toMatchObject({ step: 'conf', confirmations: 1 });
  });

  test('Tests that a send is done when it has the minimum confirmations.', () => {
    expect(
      followTxids(['a'], [row('a', RPCValueTransfersStatusEnum.confirmed, 3)]),
    ).toMatchObject({ step: 'done' });
  });

  test('Tests that a send with no txids is done when the backend named none.', () => {
    expect(followTxids([], [])).toMatchObject({ step: 'done' });
  });

  test('Tests that a send expired, partly, when one of its two transactions failed.', () => {
    expect(
      followTxids(
        ['a', 'b'],
        [
          row('a', RPCValueTransfersStatusEnum.confirmed, 2),
          row('b', RPCValueTransfersStatusEnum.failed),
        ],
      ),
    ).toMatchObject({ kind: 'failed', stage: 'expired', partial: true });
  });
});

describe('failedSince', () => {
  test('Tests that a send failed while creating has no transactions when failed rows exist.', () => {
    expect(
      failedSince('create', 0, [row('a', RPCValueTransfersStatusEnum.failed)]),
    ).toMatchObject({ rows: [], partial: false });
  });

  test('Tests that a send failed while sending finds its own rows since its attempt, the hop first.', () => {
    const hop = row(
      'hop',
      RPCValueTransfersStatusEnum.failed,
      0,
      ValueTransferKindEnum.SendToSelf,
    );
    const pay = row('pay', RPCValueTransfersStatusEnum.failed);
    const view = failedSince('send', 50, [
      pay,
      row('old', RPCValueTransfersStatusEnum.failed, 0, undefined, 10),
      row(
        'in',
        RPCValueTransfersStatusEnum.mempool,
        0,
        ValueTransferKindEnum.Received,
      ),
      hop,
    ]);
    expect(view.rows).toEqual([hop, pay]);
    expect(view).toMatchObject({ partial: false });
  });
});

describe('followsHere', () => {
  test('Tests that a send reopens on the sending screen when it is still confirming.', () => {
    expect(
      followsHere(row('a', RPCValueTransfersStatusEnum.confirmed, 2)),
    ).toBe(true);
  });

  test('Tests that a send opens its detail when it failed.', () => {
    expect(followsHere(row('a', RPCValueTransfersStatusEnum.failed))).toBe(
      false,
    );
  });

  test('Tests that a received transaction opens its detail when it is still confirming.', () => {
    expect(
      followsHere(
        row(
          'a',
          RPCValueTransfersStatusEnum.mempool,
          0,
          ValueTransferKindEnum.Received,
        ),
      ),
    ).toBe(false);
  });
});
