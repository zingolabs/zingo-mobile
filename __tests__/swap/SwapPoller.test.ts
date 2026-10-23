import { SwapPoller } from '@app/swap/SwapPoller';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { ProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { MidgardClient } from '@app/swap/MidgardClient';
import { FlashnetExecutor } from '@app/swap/providers/FlashnetExecutor';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapStore } from '@app/swap/SwapStore';
import type { ProviderExecutor } from '@app/swap/providers/ProviderExecutor';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import type { TrackResponseType } from '@app/swap/types/TrackResponseType';

// The poller's clients read `window.electronAPI` at module load; the fakes
// below stand in for every call this suite makes.

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
  overrides: Partial<SwapRecordType> = {},
): SwapRecordType => ({
  recordId: 'rec-1',
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

const passthroughExecutor = (
  provider: SwapKitProviderEnum,
): ProviderExecutor => ({
  provider,
  extractDepositInstructions: () => {
    throw new Error('not used in this suite');
  },
  applyTrackUpdate: (record: SwapRecordType) => record,
});

type Harness = {
  poller: SwapPoller;
  track: jest.Mock;
  readAll: jest.Mock;
};

const harnessFor = (records: SwapRecordType[]): Harness => {
  const track = jest.fn(async (): Promise<TrackResponseType> => ({
    status: 'PENDING',
  }));
  const readAll = jest.fn(async () => records);
  const store = {
    readAll,
    upsert: jest.fn(async () => undefined),
  } as unknown as typeof SwapStore;
  const poller = new SwapPoller({
    client: { track } as unknown as SwapKitClient,
    registry: new ProviderRegistry([
      passthroughExecutor(SwapKitProviderEnum.MayachainStreaming),
      passthroughExecutor(SwapKitProviderEnum.Near),
    ]),
    store,
    midgardClient: {
      findInboundActionByMemo: jest.fn(async () => null),
    } as unknown as MidgardClient,
    // Zero intervals so every pollable record is due on the first tick and the
    // suite never waits on wall-clock time.
    config: {
      tickIntervalMs: 10_000,
      activePollIntervalMs: 0,
      idlePollIntervalMs: 0,
    },
  });
  return { poller, track, readAll };
};

// A completed inbound Flashnet swap as `/track` reports it when queried by
// deposit address. Its source leg used to come back with an empty hash, which
// is what sent the wallet to Flashnet's own explorer for it; SwapKit fixed that
// on 2026-09-21 and the detour is gone, so this fixture carries what the API
// now answers with. The `spark` leg is Flashnet's internal hop and has no
// chain transaction to name.
const inboundFlashnetTrack: TrackResponseType = {
  status: 'completed',
  trackingStatus: 'completed',
  meta: {
    provider: 'FLASHNET',
    providerOrderId: 'ord_00000000-aaaa-bbbb-cccc-000000000001',
  },
  legs: [
    {
      chainId: 'solana',
      hash: 'SolanaDepositSignature'.padEnd(88, 'x'),
      type: 'native_send',
      status: 'completed',
    },
    {
      chainId: 'spark',
      hash: '0x' + '0'.repeat(64),
      type: 'swap',
      status: 'completed',
    },
    {
      chainId: 'zcash',
      hash: 'ee55'.repeat(16),
      type: 'native_send',
      status: 'completed',
    },
  ],
} as TrackResponseType;

describe('SwapPoller on an inbound Flashnet swap', () => {
  const record = () =>
    makeRecord({
      recordId: 'rec-flashnet-in',
      provider: SwapKitProviderEnum.Flashnet,
      direction: SwapDirectionEnum.Inbound,
      sellAsset: {
        swapKitId: 'SOL.SOL',
        chain: 'SOL',
        symbol: 'SOL',
        ticker: 'SOL',
        chainId: 'solana',
        decimals: 9,
      },
      receiveAsset: ZEC,
      depositAddress: 'SolanaDepositPlaceholder',
      providerData: { kind: SwapKitProviderEnum.Flashnet },
      broadcast: undefined,
      observedDepositTxHash: undefined,
      status: SwapStatusEnum.Processing,
    });

  const pollOnce = async () => {
    const upsert = jest.fn(async (_record: SwapRecordType) => undefined);
    const poller = new SwapPoller({
      client: {
        track: jest.fn(async () => inboundFlashnetTrack),
      } as unknown as SwapKitClient,
      registry: new ProviderRegistry([new FlashnetExecutor()]),
      store: {
        readAll: jest.fn(async () => [record()]),
        upsert,
      } as unknown as typeof SwapStore,
      midgardClient: {
        findInboundActionByMemo: jest.fn(async () => null),
      } as unknown as MidgardClient,
      config: {
        tickIntervalMs: 10_000,
        activePollIntervalMs: 0,
        idlePollIntervalMs: 0,
      },
    });
    await poller.tickOnce();
    poller.stop();
    return upsert.mock.calls.at(-1)?.[0];
  };

  // The deposit the user paid from their other wallet: the one transaction this
  // wallet did not make and cannot find on its own.
  it('takes the deposit hash from the source leg', async () => {
    const stored = await pollOnce();

    expect(stored?.observedDepositTxHash).toBe(
      'SolanaDepositSignature'.padEnd(88, 'x'),
    );
    expect(stored?.destinationTxHash).toBe('ee55'.repeat(16));
  });

  // Flashnet's own hop is not a chain transaction, and an all-zero hash links
  // nowhere.
  it("leaves the provider's internal leg out", async () => {
    const stored = await pollOnce();

    expect(JSON.stringify(stored?.intermediateLegs ?? [])).not.toContain(
      '0000000000',
    );
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('SwapPoller auto-stop', () => {
  // The live bug. An outbound Maya swap that was reserved and never paid has
  // no hash, and Maya's /track only answers to a hash — so there is nothing to
  // ask, ever. Counting it as "pollable" kept the interval armed for the life
  // of the process, decrypting the whole store every 20 seconds.
  it('stops rather than spinning on a reserved swap that can never be queried', async () => {
    const { poller, track } = harnessFor([makeRecord()]);
    poller.start();
    await poller.tickOnce();
    expect(track).not.toHaveBeenCalled();
    expect(poller.isRunning()).toBe(false);
  });

  it('stops when every record has already settled', async () => {
    const { poller, track } = harnessFor([
      makeRecord({ status: SwapStatusEnum.Completed }),
      makeRecord({ recordId: 'rec-2', status: SwapStatusEnum.Refunded }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(track).not.toHaveBeenCalled();
    expect(poller.isRunning()).toBe(false);
  });

  it('stops on a record whose provider has no executor', async () => {
    const { poller } = harnessFor([
      makeRecord({ provider: SwapKitProviderEnum.Chainflip }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(poller.isRunning()).toBe(false);
  });

  // The distinction the fix turns on: a record that is merely not due yet must
  // keep the interval alive, or the poller would stop the moment it caught up.
  it('keeps running for a record that is pollable but not due yet', async () => {
    const { poller, track } = harnessFor([
      makeRecord({
        status: SwapStatusEnum.Pending,
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'a'.repeat(64),
        },
      }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(track).toHaveBeenCalled();
    expect(poller.isRunning()).toBe(true);
    poller.stop();
  });

  it('keeps running when one record is dead and another is live', async () => {
    const { poller } = harnessFor([
      makeRecord({ recordId: 'dead', status: SwapStatusEnum.Completed }),
      makeRecord({
        recordId: 'live',
        status: SwapStatusEnum.Pending,
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'b'.repeat(64),
        },
      }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(poller.isRunning()).toBe(true);
    poller.stop();
  });

  // NEAR mints a deposit address per quote and tracks on that, so it has
  // something to ask from the moment it is reserved — unlike Maya.
  it('keeps polling a channel-provider swap that has no hash', async () => {
    const { poller, track } = harnessFor([
      makeRecord({
        provider: SwapKitProviderEnum.Near,
        depositAddress: 'near1deposit',
      }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ depositAddress: 'near1deposit' }),
    );
    expect(poller.isRunning()).toBe(true);
    poller.stop();
  });

  // Attaching a deposit transaction is what rescues the first case above, so
  // the same record has to become pollable once it carries a hash.
  it('polls the once-unqueryable record after a hash reaches it', async () => {
    const { poller, track } = harnessFor([
      makeRecord({
        status: SwapStatusEnum.Pending,
        broadcast: {
          status: BroadcastStatusEnum.Broadcasted,
          txId: 'c'.repeat(64),
        },
      }),
    ]);
    await poller.tickOnce();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ hash: 'c'.repeat(64), chainId: 'zcash' }),
    );
  });
});
