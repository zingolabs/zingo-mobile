import { SwapStore } from '@app/swap/SwapStore';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

/**
 * The store is module state over a key-value surface, so the fake below is a
 * plain map standing in for what the device writes. That is enough to
 * exercise what the store actually owns: the per-wallet namespacing, the queue
 * that serialises read-modify-write, and what a bind or a clear does to what
 * readers see.
 */
jest.mock('@app/swap/swapStorage', () => {
  const disk = new Map<string, string>();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) =>
        disk.has(key) ? disk.get(key) : null,
      ),
      setItem: jest.fn(async (key: string, value: string) => {
        disk.set(key, value);
      }),
      removeItem: jest.fn(async (key: string) => {
        disk.delete(key);
      }),
    },
    disk,
  };
});
const { default: mockStorage, disk } = jest.requireMock(
  '@app/swap/swapStorage',
) as {
  default: Record<'getItem' | 'setItem' | 'removeItem', jest.Mock>;
  disk: Map<string, string>;
};

beforeEach(async () => {
  disk.clear();
  jest.clearAllMocks();
  await SwapStore.unbind();
});

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const BTC: SwapAssetType = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const makeRecord = (
  recordId: string,
  overrides: Partial<SwapRecordType> = {},
): SwapRecordType => ({
  recordId,
  depositAddress: 'maya1vault',
  provider: SwapKitProviderEnum.MayachainStreaming,
  direction: SwapDirectionEnum.Outbound,
  routeId: 'route-1',
  sellAsset: ZEC,
  receiveAsset: BTC,
  sellAmountHumanDecimal: '1.5',
  expectedReceiveAmount: '0.002',
  minReceiveAmount: '0.0019',
  destinationAddress: 'bc1qdestination',
  sourceAddress: 't1ephemeral',
  status: SwapStatusEnum.PendingDeposit,
  providerData: {
    kind: SwapKitProviderEnum.MayachainStreaming,
    vaultAddress: 'maya1vault',
    memo: '=:b:bc1q',
  },
  fiatValueBasis: {
    sellUsdUnitPrice: 30,
    receiveUsdUnitPrice: 60000,
    capturedAt: 0,
  },
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  ...overrides,
});

describe('SwapStore binding', () => {
  it('answers empty and swallows writes until a wallet is bound', async () => {
    await SwapStore.upsert(makeRecord('rec-1'));
    expect(await SwapStore.readAll()).toEqual([]);
    expect(disk.size).toBe(0);
  });

  // The privacy boundary: two wallets on one machine write to different keys,
  // so binding to the second must not surface the first one's swaps.
  it("keeps each wallet's records to itself", async () => {
    await SwapStore.bindToWallet('wallet-aaa');
    await SwapStore.upsert(makeRecord('rec-a'));

    await SwapStore.bindToWallet('wallet-bbb');
    expect(await SwapStore.readAll()).toEqual([]);
    await SwapStore.upsert(makeRecord('rec-b'));

    await SwapStore.bindToWallet('wallet-aaa');
    expect((await SwapStore.readAll()).map(r => r.recordId)).toEqual(['rec-a']);
  });

  it("stops answering with the departing wallet's records once unbound", async () => {
    await SwapStore.bindToWallet('wallet-aaa');
    await SwapStore.upsert(makeRecord('rec-a'));

    await SwapStore.unbind();
    expect(await SwapStore.readAll()).toEqual([]);
  });
});

describe('SwapStore mutations', () => {
  beforeEach(async () => {
    await SwapStore.bindToWallet('wallet-aaa');
  });

  it('replaces a record in place rather than appending a second copy', async () => {
    await SwapStore.upsert(makeRecord('rec-1'));
    await SwapStore.upsert(
      makeRecord('rec-1', { status: SwapStatusEnum.Completed }),
    );

    const all = await SwapStore.readAll();
    expect(all).toHaveLength(1);
    expect(all[0].status).toBe(SwapStatusEnum.Completed);
  });

  // Maya rotates its inbound vault slowly enough that concurrent swaps share a
  // deposit address, so the primary key has to be the locally minted id.
  it('keeps two swaps that share a deposit address apart', async () => {
    await SwapStore.upsert(makeRecord('rec-1'));
    await SwapStore.upsert(makeRecord('rec-2'));

    expect(await SwapStore.readAll()).toHaveLength(2);
    expect(await SwapStore.findByDepositAddress('maya1vault')).toHaveLength(2);
  });

  // Two upserts that overlap must not both read the same array and have the
  // later write drop the earlier one's change. That is what the queue is for.
  it('serialises concurrent upserts instead of losing one', async () => {
    await Promise.all([
      SwapStore.upsert(makeRecord('rec-1')),
      SwapStore.upsert(makeRecord('rec-2')),
      SwapStore.upsert(makeRecord('rec-3')),
    ]);

    expect((await SwapStore.readAll()).map(r => r.recordId).sort()).toEqual([
      'rec-1',
      'rec-2',
      'rec-3',
    ]);
  });

  it('notifies subscribers with the records as they stand after each write', async () => {
    const seen: string[][] = [];
    const unsubscribe = SwapStore.subscribe(records =>
      seen.push(records.map(r => r.recordId)),
    );

    await SwapStore.upsert(makeRecord('rec-1'));
    await SwapStore.upsert(makeRecord('rec-2'));
    await SwapStore.deleteByRecordId('rec-1');
    unsubscribe();
    await SwapStore.upsert(makeRecord('rec-3'));

    expect(seen).toEqual([['rec-1'], ['rec-1', 'rec-2'], ['rec-2']]);
  });

  it('leaves the store alone when the record to delete is not there', async () => {
    await SwapStore.upsert(makeRecord('rec-1'));
    const seen: string[][] = [];
    const unsubscribe = SwapStore.subscribe(records =>
      seen.push(records.map(r => r.recordId)),
    );

    await SwapStore.deleteByRecordId('rec-absent');

    expect(seen).toEqual([]);
    expect(await SwapStore.readAll()).toHaveLength(1);
    unsubscribe();
  });
});

describe('SwapStore clearing', () => {
  // What the delete-wallet flow depends on: the records leave the disk, not
  // just the reader's view.
  it("takes the wallet's records off disk", async () => {
    await SwapStore.bindToWallet('wallet-aaa');
    await SwapStore.upsert(makeRecord('rec-1'));
    expect(disk.has('swap:records:wallet-aaa')).toBe(true);

    await SwapStore.clearForWallet('wallet-aaa');

    expect(disk.has('swap:records:wallet-aaa')).toBe(false);
    expect(await SwapStore.readAll()).toEqual([]);
  });

  // A removal that fails leaves the overwrite standing, so what survives reads
  // back as an empty bucket rather than as the wallet's history.
  it('empties the bucket even when the key cannot be removed', async () => {
    await SwapStore.bindToWallet('wallet-aaa');
    await SwapStore.upsert(makeRecord('rec-1'));
    mockStorage.removeItem.mockRejectedValueOnce(new Error('file is locked'));

    await SwapStore.clearForWallet('wallet-aaa');

    expect(disk.get('swap:records:wallet-aaa')).toBe('[]');
    expect(await SwapStore.readAll()).toEqual([]);
  });

  it("clears another wallet's bucket without disturbing the bound one", async () => {
    await SwapStore.bindToWallet('wallet-aaa');
    await SwapStore.upsert(makeRecord('rec-a'));
    await SwapStore.bindToWallet('wallet-bbb');
    await SwapStore.upsert(makeRecord('rec-b'));

    await SwapStore.clearForWallet('wallet-aaa');

    expect((await SwapStore.readAll()).map(r => r.recordId)).toEqual(['rec-b']);
  });
});

describe('SwapStore corruption', () => {
  // A wallet whose bucket cannot be parsed is not a wallet-fatal event: the
  // records are tracking metadata, and the next swap rebuilds the list.
  it('heals an unparseable bucket rather than throwing at every reader', async () => {
    disk.set('swap:records:wallet-aaa', 'not json at all');
    await SwapStore.bindToWallet('wallet-aaa');

    expect(await SwapStore.readAll()).toEqual([]);
    expect(disk.get('swap:records:wallet-aaa')).toBe('[]');
  });

  // A read that fails is different from a bucket with no records in it, and
  // the store must not let a swap in flight vanish from the history because a
  // single read went wrong. It answers empty for that read and leaves the
  // stored records where they are.
  it('leaves the records on disk when a read fails', async () => {
    await SwapStore.bindToWallet('wallet-aaa');
    await SwapStore.upsert(makeRecord('rec-1'));
    const stored = disk.get('swap:records:wallet-aaa');

    mockStorage.getItem.mockRejectedValueOnce(new Error('storage unavailable'));
    expect(await SwapStore.readAll()).toEqual([]);

    expect(disk.get('swap:records:wallet-aaa')).toBe(stored);
  });
});
