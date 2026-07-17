/**
 * @format
 */

import { PoolEnum, ValueTransferKindEnum } from '../app/AppState';
import { RPCValueTransfersKindEnum } from '../app/walletBackend/enums/RPCValueTransfersKindEnum';
import { RPCValueTransfersStatusEnum } from '../app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { transformValueTransfer } from '../app/walletBackend/transforms/valueTransferTransform';
import { RPCValueTransferType } from '../app/walletBackend/types/RPCValueTransferType';

function makeVt(
  overrides: Partial<RPCValueTransferType> = {},
): RPCValueTransferType {
  return {
    txid: 'abc123',
    datetime: 1700000000,
    status: RPCValueTransfersStatusEnum.confirmed,
    blockheight: 1000,
    kind: RPCValueTransfersKindEnum.received,
    value: 100_000_000,
    ...overrides,
  };
}

describe('transformValueTransfer — kind mapping', () => {
  const cases: [RPCValueTransfersKindEnum, ValueTransferKindEnum][] = [
    [RPCValueTransfersKindEnum.sent, ValueTransferKindEnum.Sent],
    [RPCValueTransfersKindEnum.received, ValueTransferKindEnum.Received],
    [RPCValueTransfersKindEnum.memoToSelf, ValueTransferKindEnum.MemoToSelf],
    [RPCValueTransfersKindEnum.sendToSelf, ValueTransferKindEnum.SendToSelf],
    [RPCValueTransfersKindEnum.shield, ValueTransferKindEnum.Shield],
    [RPCValueTransfersKindEnum.rejection, ValueTransferKindEnum.Rejection],
  ];

  test.each(cases)('maps %s → %s', (rpcKind, appKind) => {
    const result = transformValueTransfer(
      makeVt({ kind: rpcKind }),
      1100,
      1100,
    );
    expect(result.kind).toBe(appKind);
  });
});

describe('transformValueTransfer — confirmations', () => {
  test('pending statuses yield 0 confirmations', () => {
    const pendingStatuses = [
      RPCValueTransfersStatusEnum.calculated,
      RPCValueTransfersStatusEnum.transmitted,
      RPCValueTransfersStatusEnum.mempool,
      RPCValueTransfersStatusEnum.failed,
    ];
    for (const status of pendingStatuses) {
      const result = transformValueTransfer(
        makeVt({ status, blockheight: 1000 }),
        2000,
        2000,
      );
      expect(result.confirmations).toBe(0);
    }
  });

  test('confirmed: uses server height when server is ahead of wallet', () => {
    // blockheight=1000, server=1200, wallet=1100 → 1200-1000+1 = 201
    const result = transformValueTransfer(
      makeVt({ blockheight: 1000 }),
      1200,
      1100,
    );
    expect(result.confirmations).toBe(201);
  });

  test('confirmed: uses wallet height when wallet is ahead of server', () => {
    // blockheight=1000, server=1100, wallet=1200 → 1200-1000+1 = 201
    const result = transformValueTransfer(
      makeVt({ blockheight: 1000 }),
      1100,
      1200,
    );
    expect(result.confirmations).toBe(201);
  });

  test('confirmed: uses wallet height when server equals wallet', () => {
    // blockheight=1000, server=wallet=1100 → server is eligible (>=) → 1100-1000+1 = 101
    const result = transformValueTransfer(
      makeVt({ blockheight: 1000 }),
      1100,
      1100,
    );
    expect(result.confirmations).toBe(101);
  });
});

describe('transformValueTransfer — amount and fee conversion', () => {
  test('converts value from zats to ZEC', () => {
    const result = transformValueTransfer(
      makeVt({ value: 100_000_000 }),
      1100,
      1100,
    );
    expect(result.amount).toBeCloseTo(1.0);
  });

  test('converts transaction_fee from zats to ZEC', () => {
    const result = transformValueTransfer(
      makeVt({ transaction_fee: 10_000 }),
      1100,
      1100,
    );
    expect(result.fee).toBeCloseTo(0.0001);
  });

  test('defaults fee to 0 when transaction_fee is absent', () => {
    const result = transformValueTransfer(makeVt(), 1100, 1100);
    expect(result.fee).toBe(0);
  });

  test('defaults amount to 0 when value is 0', () => {
    const result = transformValueTransfer(makeVt({ value: 0 }), 1100, 1100);
    expect(result.amount).toBe(0);
  });
});

describe('transformValueTransfer — optional fields', () => {
  test('passes through txid, time, blockheight, status', () => {
    const vt = makeVt({ txid: 'deadbeef', datetime: 9999, blockheight: 42 });
    const result = transformValueTransfer(vt, 1000, 1000);
    expect(result.txid).toBe('deadbeef');
    expect(result.time).toBe(9999);
    expect(result.blockheight).toBe(42);
    expect(result.status).toBe(RPCValueTransfersStatusEnum.confirmed);
  });

  test('zecPrice defaults to 0 when absent', () => {
    const result = transformValueTransfer(makeVt(), 1100, 1100);
    expect(result.zecPrice).toBe(0);
  });

  test('zecPrice is preserved when present', () => {
    const result = transformValueTransfer(
      makeVt({ zec_price: 42.5 }),
      1100,
      1100,
    );
    expect(result.zecPrice).toBe(42.5);
  });

  test('address is undefined when recipient_address is absent', () => {
    const result = transformValueTransfer(makeVt(), 1100, 1100);
    expect(result.address).toBeUndefined();
  });

  test('address is set when recipient_address is present', () => {
    const result = transformValueTransfer(
      makeVt({ recipient_address: 'zs1abc' }),
      1100,
      1100,
    );
    expect(result.address).toBe('zs1abc');
  });

  test('memos is undefined when memos array is absent', () => {
    const result = transformValueTransfer(makeVt(), 1100, 1100);
    expect(result.memos).toBeUndefined();
  });

  test('memos is undefined when memos array is empty', () => {
    const result = transformValueTransfer(makeVt({ memos: [] }), 1100, 1100);
    expect(result.memos).toBeUndefined();
  });

  test('memos is undefined when all memos are empty strings', () => {
    const result = transformValueTransfer(
      makeVt({ memos: ['', ''] }),
      1100,
      1100,
    );
    expect(result.memos).toBeUndefined();
  });

  test('memos is set when at least one memo has content', () => {
    const result = transformValueTransfer(
      makeVt({ memos: ['hello', ''] }),
      1100,
      1100,
    );
    expect(result.memos).toEqual(['hello', '']);
  });

  test('poolType is undefined when pools_received is absent', () => {
    const result = transformValueTransfer(makeVt(), 1100, 1100);
    expect(result.poolType).toBeUndefined();
  });

  test('poolType is undefined when pools_received is empty', () => {
    const result = transformValueTransfer(
      makeVt({ pools_received: [] }),
      1100,
      1100,
    );
    expect(result.poolType).toBeUndefined();
  });
});

// The fixtures below reproduce value transfers observed on the
// ironwood-activated regtest chain (CI run 29603362971 logcat): zingolib
// feat/ironwood reports per-direction pool lists, and unified-address
// receives land in the Ironwood pool. These pin the plural schema so the
// retired singular `pool_received` cannot silently return.
describe('transformValueTransfer — ironwood pool lists', () => {
  test('a single-pool receive shows its pool', () => {
    const result = transformValueTransfer(
      makeVt({
        kind: RPCValueTransfersKindEnum.received,
        value: 1_000_000,
        pools_sent_from: [],
        pools_received: [PoolEnum.IronwoodPool],
      }),
      1100,
      1100,
    );
    expect(result.poolType).toBe(PoolEnum.IronwoodPool);
  });

  test('a multi-pool memo-to-self shows the newest pool', () => {
    const result = transformValueTransfer(
      makeVt({
        kind: RPCValueTransfersKindEnum.memoToSelf,
        value: 0,
        transaction_fee: 20_000,
        pools_sent_from: [PoolEnum.IronwoodPool],
        pools_received: [PoolEnum.SaplingPool, PoolEnum.IronwoodPool],
        memos: ['note-to-self test memo'],
      }),
      1100,
      1100,
    );
    expect(result.poolType).toBe(PoolEnum.IronwoodPool);
  });
});
