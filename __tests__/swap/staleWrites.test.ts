import { SwapPoller } from '@app/swap/SwapPoller';
import { SwapService } from '@app/swap/SwapService';
import { SwapStore } from '@app/swap/SwapStore';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { MidgardClient } from '@app/swap/MidgardClient';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

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
const { disk } = jest.requireMock('@app/swap/swapStorage') as {
  disk: Map<string, string>;
};

const prepareStorage = () => disk.clear();

const ZEC = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};
const BTC = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const NOT_STARTED = {
  status: 'not_started',
  trackingStatus: 'not_started',
  toAmount: '0',
  legs: [],
};

const unsentSale = {
  recordId: 'rec-1',
  provider: SwapKitProviderEnum.Near,
  direction: SwapDirectionEnum.Outbound,
  depositAddress: 't1deposit',
  destinationAddress: 'bc1qdestination',
  sourceAddress: 't1source',
  sellAsset: ZEC,
  receiveAsset: BTC,
  status: SwapStatusEnum.PendingDeposit,
  broadcast: { status: BroadcastStatusEnum.PendingBroadcast },
  providerData: { kind: SwapKitProviderEnum.Near, depositAddress: 't1deposit' },
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
} as unknown as SwapRecordType;

/** A tick stopped at `/track`, so the test can act before it answers. */
const tickWaitingOnTrack = async () => {
  let answer: (value: unknown) => void = () => {};
  const track = jest.fn(() => new Promise(resolve => (answer = resolve)));
  const poller = new SwapPoller({
    client: { track } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: SwapStore,
    midgardClient: {} as unknown as MidgardClient,
    config: {
      tickIntervalMs: 10_000,
      activePollIntervalMs: 0,
      idlePollIntervalMs: 0,
    },
  });
  const tick = poller.tickOnce();
  while (track.mock.calls.length === 0) {
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return async (response: unknown) => {
    answer(response);
    await tick;
  };
};

beforeEach(async () => {
  prepareStorage();
  await SwapStore.unbind();
  await SwapStore.bindToWallet('fingerprint');
  await SwapStore.upsert(unsentSale);
});

describe('a write that lands while /track is answering', () => {
  it('Tests that a broadcast stays marked when /track answers from before it', async () => {
    const finish = await tickWaitingOnTrack();

    const service = new SwapService({
      client: {} as unknown as SwapKitClient,
      registry: createDefaultProviderRegistry(),
      store: SwapStore,
      poller: { start: jest.fn() } as unknown as SwapPoller,
      tokenCatalog: null as unknown as TokenCatalog,
    });
    await service.markBroadcasted({ recordId: 'rec-1', txId: 'ab'.repeat(32) });
    await finish(NOT_STARTED);

    const stored = await SwapStore.getByRecordId('rec-1');
    expect(stored?.status).toBe(SwapStatusEnum.Pending);
    expect(stored?.broadcast?.status).toBe(BroadcastStatusEnum.Broadcasted);
    expect(stored?.broadcast?.txId).toBe('ab'.repeat(32));
  });

  it('Tests that a deleted swap stays deleted when /track answers after it', async () => {
    const finish = await tickWaitingOnTrack();

    await SwapStore.deleteByRecordId('rec-1');
    await finish(NOT_STARTED);

    expect(await SwapStore.getByRecordId('rec-1')).toBeUndefined();
  });

  it('Tests that /track reaches the record when nothing else wrote to it', async () => {
    const finish = await tickWaitingOnTrack();

    await finish({ status: 'swapping', trackingStatus: 'swapping', legs: [] });

    expect((await SwapStore.getByRecordId('rec-1'))?.status).toBe(
      SwapStatusEnum.Processing,
    );
  });
});

describe('SwapStore.update', () => {
  it('Tests that it writes nothing when the change hands back the same record', async () => {
    const seen = jest.fn();
    const unsubscribe = SwapStore.subscribe(seen);
    seen.mockClear();

    await SwapStore.update('rec-1', current => current);

    expect(seen).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('Tests that it resolves to nothing when the record is gone', async () => {
    const change = jest.fn();

    expect(await SwapStore.update('missing', change)).toBeUndefined();
    expect(change).not.toHaveBeenCalled();
  });
});
