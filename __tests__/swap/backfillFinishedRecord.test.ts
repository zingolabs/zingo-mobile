import { SwapService } from '@app/swap/SwapService';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import { TRACK_CAPTURE_VERSION } from '@app/swap/providers/trackUpdateBase';
import {
  REFUND_HASH,
  REFUNDED_DEPOSIT_HASH,
  flashnetRefundedTrack,
} from '../../__mocks__/dataMocks/swap/flashnetRefundedTrack';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import type { TrackResponseType } from '@app/swap/types/TrackResponseType';

const ZEC: SwapAssetType = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};

const SOL_USDC: SwapAssetType = {
  swapKitId: 'SOL.USDC-EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  chain: 'SOL',
  symbol: 'USDC',
  ticker: 'USDC',
  chainId: 'solana',
  decimals: 6,
};

/** A refunded Flashnet swap as an older build left it: no capture version. */
const finished = (overrides: Partial<SwapRecordType> = {}): SwapRecordType => ({
  recordId: 'rec-1',
  depositAddress: 't1FlashnetDepositPlaceholder',
  provider: SwapKitProviderEnum.Flashnet,
  direction: SwapDirectionEnum.Outbound,
  routeId: 'route-1',
  sellAsset: ZEC,
  receiveAsset: SOL_USDC,
  sellAmountHumanDecimal: '0.007',
  expectedReceiveAmount: '7.7',
  minReceiveAmount: '7.6',
  destinationAddress: 'SolanaDestinationPlaceholder',
  sourceAddress: 't1EphemeralSourcePlaceholder',
  status: SwapStatusEnum.Refunded,
  providerData: { kind: SwapKitProviderEnum.Flashnet },
  broadcast: { txId: REFUNDED_DEPOSIT_HASH } as SwapRecordType['broadcast'],
  observedDepositTxHash: REFUNDED_DEPOSIT_HASH,
  destinationTxHash: REFUND_HASH,
  fiatValueBasis: {
    sellUsdUnitPrice: 1100,
    receiveUsdUnitPrice: 1,
    capturedAt: 0,
  },
  createdAtMs: 1_700_000_000_000,
  updatedAtMs: 1_700_000_000_000,
  ...overrides,
});

const serviceOver = (
  stored: SwapRecordType,
  track: () => Promise<TrackResponseType>,
) => {
  const upsert = jest.fn(async (_record: SwapRecordType) => undefined);
  const trackMock = jest.fn(track);
  const service = new SwapService({
    client: { track: trackMock } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: {
      getByRecordId: async () => stored,
      upsert,
    } as unknown as typeof SwapStore,
    poller: null as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return { service, upsert, track: trackMock };
};

/**
 * The poller drops a swap once it finishes, so a record that finished before
 * the tracker kept some detail, or while it kept something wrong, never gets
 * corrected. The detail view asks about such a record once when it is shown.
 */
// A completed inbound Flashnet swap as `/track` now reports it when queried by
// deposit address, with the source leg filled (SwapKit, 2026-09-21).
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

describe('SwapService.backfillFinishedRecord on an inbound Flashnet swap', () => {
  const inbound = () =>
    finished({
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
      status: SwapStatusEnum.Completed,
      broadcast: undefined,
      observedDepositTxHash: undefined,
      destinationTxHash: undefined,
      refundInfo: undefined,
      trackCaptureVersion: 2,
    });

  // A swap that finished while `/track` was still answering with an empty
  // source leg has no deposit hash on the record. Opening its detail asks
  // again, and now there is one to take.
  it('fills the deposit hash of a finished swap when it is shown', async () => {
    const upsert = jest.fn(async (_record: SwapRecordType) => undefined);
    const service = new SwapService({
      client: {
        track: jest.fn(async () => inboundFlashnetTrack),
      } as unknown as SwapKitClient,
      registry: createDefaultProviderRegistry(),
      store: {
        getByRecordId: async () => inbound(),
        upsert,
      } as unknown as typeof SwapStore,
      poller: null as unknown as SwapPoller,
      tokenCatalog: null as unknown as TokenCatalog,
    });

    const updated = await service.backfillFinishedRecord('rec-1');

    expect(updated?.observedDepositTxHash).toBe(
      'SolanaDepositSignature'.padEnd(88, 'x'),
    );
    expect(updated?.trackCaptureVersion).toBe(TRACK_CAPTURE_VERSION);
  });
});

describe('SwapService.backfillFinishedRecord', () => {
  it('asks /track about a finished swap an older tracker left behind, and stores the answer', async () => {
    const { service, upsert, track } = serviceOver(
      finished(),
      async () => flashnetRefundedTrack,
    );

    const updated = await service.backfillFinishedRecord('rec-1');

    // Flashnet keys its tracker on the deposit address, as the poller does.
    expect(track).toHaveBeenCalledWith({
      chainId: 'zcash',
      depositAddress: 't1FlashnetDepositPlaceholder',
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(updated?.trackCaptureVersion).toBe(TRACK_CAPTURE_VERSION);
    expect(updated?.destinationTxHash).toBeUndefined();
    expect(updated?.refundInfo?.refundTxHash).toBe(REFUND_HASH);
  });

  it('leaves a record stamped by the current tracker alone', async () => {
    const { service, track } = serviceOver(
      finished({ trackCaptureVersion: TRACK_CAPTURE_VERSION }),
      async () => flashnetRefundedTrack,
    );

    expect(await service.backfillFinishedRecord('rec-1')).toBeUndefined();
    expect(track).not.toHaveBeenCalled();
  });

  // The poller still owns a swap in progress.
  it('leaves a swap that has not finished to the poller', async () => {
    const { service, track } = serviceOver(
      finished({ status: SwapStatusEnum.Processing }),
      async () => flashnetRefundedTrack,
    );

    expect(await service.backfillFinishedRecord('rec-1')).toBeUndefined();
    expect(track).not.toHaveBeenCalled();
  });

  // An abandoned or expired swap that never saw a deposit gives /track
  // nothing to answer about.
  it('does not ask about a finished swap that was never paid', async () => {
    const { service, track } = serviceOver(
      finished({
        status: SwapStatusEnum.Expired,
        broadcast: undefined,
        observedDepositTxHash: undefined,
      }),
      async () => flashnetRefundedTrack,
    );

    expect(await service.backfillFinishedRecord('rec-1')).toBeUndefined();
    expect(track).not.toHaveBeenCalled();
  });

  // Stepping back and forth with the arrows must not repeat a failing request.
  it('asks at most once a session, even when the request fails', async () => {
    const { service, track } = serviceOver(finished(), async () => {
      throw new Error('tracker unavailable');
    });

    expect(await service.backfillFinishedRecord('rec-1')).toBeUndefined();
    expect(await service.backfillFinishedRecord('rec-1')).toBeUndefined();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('keeps a finished swap finished whatever the old answer maps to', async () => {
    const { service } = serviceOver(finished(), async () => ({
      ...flashnetRefundedTrack,
      status: 'pending',
    }));

    const updated = await service.backfillFinishedRecord('rec-1');

    expect(updated?.status).toBe(SwapStatusEnum.Refunded);
  });
});
