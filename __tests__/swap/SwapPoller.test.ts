import { SwapPoller } from '@app/swap/SwapPoller';
import { BroadcastStatusEnum } from '@app/swap/enums/BroadcastStatusEnum';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { ProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import type { MidgardClient } from '@app/swap/MidgardClient';
import { FlashnetExecutor } from '@app/swap/providers/FlashnetExecutor';
import { NearIntentsExecutor } from '@app/swap/providers/NearIntentsExecutor';
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

describe('SwapPoller on an awaited deposit with a deadline', () => {
  const T0 = 1_700_000_000_000;
  const awaited = (overrides: Partial<SwapRecordType> = {}) =>
    makeRecord({
      recordId: 'rec-await',
      provider: SwapKitProviderEnum.Near,
      direction: SwapDirectionEnum.Inbound,
      sellAsset: BTC,
      receiveAsset: ZEC,
      depositAddress: 'bc1qdeposit',
      providerData: {
        kind: SwapKitProviderEnum.Near,
        depositAddress: 'bc1qdeposit',
      },
      broadcast: undefined,
      status: SwapStatusEnum.AwaitingExternalDeposit,
      createdAtMs: T0,
      updatedAtMs: T0,
      depositDeadlineMs: T0 + 600_000,
      ...overrides,
    });

  const harnessAt = (nowMs: number, records: SwapRecordType[]) => {
    jest.useFakeTimers({ now: nowMs });
    const track = jest.fn(async (): Promise<TrackResponseType> => ({
      status: 'NOT_STARTED',
    }));
    const upsert = jest.fn(async (_record: SwapRecordType) => undefined);
    const poller = new SwapPoller({
      client: { track } as unknown as SwapKitClient,
      registry: new ProviderRegistry([
        passthroughExecutor(SwapKitProviderEnum.MayachainStreaming),
        passthroughExecutor(SwapKitProviderEnum.Near),
      ]),
      store: {
        readAll: jest.fn(async () => records),
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
    return { poller, track, upsert };
  };

  // The reported case: a deposit that never came kept the swap "in progress"
  // for twelve hours, because only `/track` could end it and it never did.
  it('expires the swap at the deadline with nothing seen, without asking /track', async () => {
    const { poller, track, upsert } = harnessAt(T0 + 600_000, [awaited()]);
    await poller.tickOnce();
    expect(track).not.toHaveBeenCalled();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        recordId: 'rec-await',
        status: SwapStatusEnum.Expired,
        terminalAtMs: T0 + 600_000,
      }),
    );
  });

  it('keeps asking /track while the deadline is ahead', async () => {
    const { poller, track, upsert } = harnessAt(T0 + 599_000, [awaited()]);
    await poller.tickOnce();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ depositAddress: 'bc1qdeposit' }),
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  // A deposit nothing can be asked about still has a deadline to meet, and
  // the tick has to stay alive to meet it.
  it('keeps running for an unqueryable deposit until its deadline', async () => {
    const { poller, track, upsert } = harnessAt(T0 + 1_000, [
      awaited({ provider: SwapKitProviderEnum.Chainflip }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(track).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
    expect(poller.isRunning()).toBe(true);
    poller.stop();
  });

  it('expires an unqueryable deposit at its deadline', async () => {
    const { poller, upsert } = harnessAt(T0 + 600_000, [
      awaited({ provider: SwapKitProviderEnum.Chainflip }),
    ]);
    poller.start();
    await poller.tickOnce();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: SwapStatusEnum.Expired }),
    );
    expect(poller.isRunning()).toBe(false);
  });

  it('leaves a deposit the provider saw alone past the deadline', async () => {
    const { poller, upsert } = harnessAt(T0 + 900_000, [
      awaited({ observedDepositTxHash: 'ab'.repeat(32) }),
    ]);
    await poller.tickOnce();
    expect(upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({ status: SwapStatusEnum.Expired }),
    );
  });

  // Records made before the deadline was kept read the window from their
  // creation, so the ones already stuck end on the next launch.
  it('expires a record without a deadline once the window after creation passes', async () => {
    const { poller, upsert } = harnessAt(T0 + 15 * 60 * 1000, [
      awaited({ depositDeadlineMs: undefined }),
    ]);
    await poller.tickOnce();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: SwapStatusEnum.Expired }),
    );
  });
});

describe('SwapPoller on an expired purchase', () => {
  const T0 = 1_700_000_000_000;
  const expiredAt = T0 + 600_000;
  const expired = (overrides: Partial<SwapRecordType> = {}) =>
    makeRecord({
      recordId: 'rec-expired',
      provider: SwapKitProviderEnum.Near,
      direction: SwapDirectionEnum.Inbound,
      sellAsset: BTC,
      receiveAsset: ZEC,
      depositAddress: 'bc1qdeposit',
      providerData: {
        kind: SwapKitProviderEnum.Near,
        depositAddress: 'bc1qdeposit',
      },
      broadcast: undefined,
      status: SwapStatusEnum.Expired,
      createdAtMs: T0,
      updatedAtMs: T0,
      depositDeadlineMs: expiredAt,
      terminalAtMs: expiredAt,
      ...overrides,
    });

  const harnessAt = (
    nowMs: number,
    records: SwapRecordType[],
    answer: TrackResponseType,
  ) => {
    jest.useFakeTimers({ now: nowMs });
    const track = jest.fn(async (): Promise<TrackResponseType> => answer);
    const upsert = jest.fn(async (_record: SwapRecordType) => undefined);
    const poller = new SwapPoller({
      client: { track } as unknown as SwapKitClient,
      registry: new ProviderRegistry([new NearIntentsExecutor()]),
      store: {
        readAll: jest.fn(async () => records),
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
    return { poller, track, upsert };
  };

  // An unpaid address answers with an open state; that is no payment.
  it('keeps asking within the watch and stays expired on an answer without a payment', async () => {
    const { poller, track, upsert } = harnessAt(
      expiredAt + 60_000,
      [expired()],
      {
        status: 'PENDING',
      },
    );
    await poller.tickOnce();
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({ depositAddress: 'bc1qdeposit' }),
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('turns to refunding on a late payment the provider saw', async () => {
    const { poller, upsert } = harnessAt(expiredAt + 60_000, [expired()], {
      status: 'PENDING',
      trackingStatus: 'inbound',
      legs: [{ chainId: 'bitcoin', hash: 'ab'.repeat(32) }],
    });
    await poller.tickOnce();
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        status: SwapStatusEnum.Pending,
        observedDepositTxHash: 'ab'.repeat(32),
        lateDepositAtMs: expiredAt + 60_000,
      }),
    );
  });

  it('takes the refund verdict straight away', async () => {
    const { poller, upsert } = harnessAt(expiredAt + 60_000, [expired()], {
      status: 'REFUNDED',
    });
    await poller.tickOnce();
    const stored = upsert.mock.calls.at(-1)?.[0];
    expect(stored?.status).toBe(SwapStatusEnum.Refunded);
    expect(stored?.lateDepositAtMs).toBeUndefined();
  });

  it('stops asking once the watch is over', async () => {
    const { poller, track } = harnessAt(
      expiredAt + 24 * 60 * 60 * 1000,
      [expired()],
      { status: 'PENDING' },
    );
    poller.start();
    await poller.tickOnce();
    expect(track).not.toHaveBeenCalled();
    expect(poller.isRunning()).toBe(false);
  });
});
