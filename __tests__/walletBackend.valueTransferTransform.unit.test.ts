import { Pool, TransferKind, TransferStatus, ValueTransfer } from 'zingo-ffi';
import { PoolEnum, ValueTransferKindEnum } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { transformValueTransfer } from '@app/walletBackend/transforms/valueTransferTransform';

function makeVt(overrides: Partial<ValueTransfer> = {}): ValueTransfer {
  return {
    txid: 'abc123',
    datetime: 1700000000,
    status: TransferStatus.Confirmed,
    blockheight: 1000,
    transactionFee: undefined,
    zecPrice: undefined,
    kind: TransferKind.Received,
    value: 100_000_000n,
    recipientAddress: undefined,
    poolsSentFrom: [],
    poolsReceived: [],
    memos: [],
    ...overrides,
  };
}

describe('kind and status mapping', () => {
  test.each([
    [TransferKind.Sent, ValueTransferKindEnum.Sent],
    [TransferKind.Received, ValueTransferKindEnum.Received],
    [TransferKind.MemoToSelf, ValueTransferKindEnum.MemoToSelf],
    [TransferKind.SendToSelf, ValueTransferKindEnum.SendToSelf],
    [TransferKind.Migration, ValueTransferKindEnum.Migration],
    [TransferKind.Shield, ValueTransferKindEnum.Shield],
    [TransferKind.Refund, ValueTransferKindEnum.Rejection],
  ])(
    'Tests that kind %s maps to the app kind when transformed',
    (kind, appKind) => {
      expect(transformValueTransfer(makeVt({ kind }), 1100, 1100).kind).toBe(
        appKind,
      );
    },
  );

  test.each([
    [TransferStatus.Calculated, RPCValueTransfersStatusEnum.calculated],
    [TransferStatus.Transmitted, RPCValueTransfersStatusEnum.transmitted],
    [TransferStatus.Mempool, RPCValueTransfersStatusEnum.mempool],
    [TransferStatus.Confirmed, RPCValueTransfersStatusEnum.confirmed],
    [TransferStatus.Failed, RPCValueTransfersStatusEnum.failed],
  ])(
    'Tests that status %s maps to the app status when transformed',
    (status, appStatus) => {
      expect(
        transformValueTransfer(makeVt({ status }), 1100, 1100).status,
      ).toBe(appStatus);
    },
  );
});

describe('confirmations', () => {
  test('Tests that pending statuses yield zero confirmations when the transfer is unmined', () => {
    for (const status of [
      TransferStatus.Calculated,
      TransferStatus.Transmitted,
      TransferStatus.Mempool,
      TransferStatus.Failed,
    ]) {
      expect(
        transformValueTransfer(makeVt({ status, blockheight: 1000 }), 2000, 2000)
          .confirmations,
      ).toBe(0);
    }
  });

  test('Tests that the server height counts when it is ahead of the wallet height', () => {
    expect(
      transformValueTransfer(makeVt({ blockheight: 1000 }), 1500, 1200)
        .confirmations,
    ).toBe(501);
  });

  test('Tests that the wallet height counts when the server height is behind or absent', () => {
    expect(
      transformValueTransfer(makeVt({ blockheight: 1000 }), 1100, 1200)
        .confirmations,
    ).toBe(201);
    expect(
      transformValueTransfer(makeVt({ blockheight: 1000 }), 0, 1200)
        .confirmations,
    ).toBe(201);
  });
});

describe('amounts, memos and pools', () => {
  test('Tests that zatoshi amounts convert to ZEC when transformed', () => {
    const vt = transformValueTransfer(
      makeVt({ value: 150_000_000n, transactionFee: 10_000n, zecPrice: 33.5 }),
      1100,
      1100,
    );
    expect(vt.amount).toBe(1.5);
    expect(vt.fee).toBe(0.0001);
    expect(vt.zecPrice).toBe(33.5);
  });

  test('Tests that absent fee and price read as zero when the wallet reports none', () => {
    const vt = transformValueTransfer(makeVt(), 1100, 1100);
    expect(vt.fee).toBe(0);
    expect(vt.zecPrice).toBe(0);
  });

  test('Tests that memos read as undefined when every memo is empty', () => {
    expect(
      transformValueTransfer(makeVt({ memos: ['', ''] }), 1100, 1100).memos,
    ).toBeUndefined();
    expect(
      transformValueTransfer(makeVt({ memos: ['hi'] }), 1100, 1100).memos,
    ).toEqual(['hi']);
  });

  test('Tests that the newest received pool is surfaced when a transfer spans pools', () => {
    expect(
      transformValueTransfer(
        makeVt({ poolsReceived: [Pool.Orchard, Pool.Ironwood] }),
        1100,
        1100,
      ).poolType,
    ).toBe(PoolEnum.IronwoodPool);
    expect(
      transformValueTransfer(makeVt(), 1100, 1100).poolType,
    ).toBeUndefined();
  });

  test('Tests that the recipient address carries through when present', () => {
    expect(
      transformValueTransfer(makeVt({ recipientAddress: 'u1...' }), 1100, 1100)
        .address,
    ).toBe('u1...');
  });
});
