import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import { createDefaultProviderRegistry } from '@app/swap/providers/ProviderRegistry';
import { TRACK_CAPTURE_VERSION } from '@app/swap/providers/trackUpdateBase';
import { SwapService } from '@app/swap/SwapService';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type { SwapPoller } from '@app/swap/SwapPoller';
import type { SwapStore } from '@app/swap/SwapStore';
import type { TokenCatalog } from '@app/swap/TokenCatalog';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';

const DEPOSIT_HASH = 'cd'.repeat(32);
const DELIVERY_HASH = 'ef'.repeat(32);

const purchase = (over: Partial<SwapRecordType>) =>
  ({
    recordId: 'rec-1',
    provider: SwapKitProviderEnum.ThorchainStreaming,
    direction: SwapDirectionEnum.Inbound,
    depositAddress: 'bc1qvault',
    sourceAddress: 'bc1quser',
    destinationAddress: 't1wallet',
    sellAsset: { chainId: 'bitcoin', chain: 'BTC', decimals: 8 },
    receiveAsset: { chainId: 'zcash', chain: 'ZEC', decimals: 8 },
    providerData: { memo: '=:ZEC.ZEC:t1wallet' },
    status: SwapStatusEnum.Expired,
    terminalAtMs: 1_700_000_000_000,
    trackCaptureVersion: TRACK_CAPTURE_VERSION,
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_000_000,
    ...over,
  }) as unknown as SwapRecordType;

const harness = (
  stored: SwapRecordType,
  found: SwapRecordType | null,
  track: jest.Mock = jest.fn(async () => {
    throw new Error('offline');
  }),
) => {
  const upsert = jest.fn(async (_record: SwapRecordType) => undefined);
  const poller = {
    discoverViaMidgard: jest.fn(async () => found),
    isRunning: jest.fn(() => true),
    start: jest.fn(),
    tickOnce: jest.fn(async () => undefined),
  };
  const service = new SwapService({
    client: { track } as unknown as SwapKitClient,
    registry: createDefaultProviderRegistry(),
    store: {
      getByRecordId: async () => stored,
      upsert,
    } as unknown as typeof SwapStore,
    poller: poller as unknown as SwapPoller,
    tokenCatalog: null as unknown as TokenCatalog,
  });
  return { service, poller, upsert, track };
};

describe('opening a finished Maya or THORChain purchase', () => {
  test('Tests that Midgard is asked again each time when it found nothing', async () => {
    const { service, poller, track } = harness(purchase({}), null);

    await service.backfillFinishedRecord('rec-1');
    await service.backfillFinishedRecord('rec-1');

    expect(poller.discoverViaMidgard).toHaveBeenCalledTimes(2);
    expect(track).not.toHaveBeenCalled();
  });

  test('Tests that an expired record stays as it was when Midgard found nothing', async () => {
    const { service, upsert } = harness(purchase({}), null);

    expect(await service.backfillFinishedRecord('rec-1')).toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
  });

  test('Tests that the poller takes over when a found payment reopens an expired record', async () => {
    const found = purchase({
      status: SwapStatusEnum.Pending,
      observedDepositTxHash: DEPOSIT_HASH,
    });
    const { service, poller, track } = harness(purchase({}), found);

    const updated = await service.backfillFinishedRecord('rec-1');

    expect(updated).toBe(found);
    expect(track).toHaveBeenCalledWith({
      chainId: 'bitcoin',
      hash: DEPOSIT_HASH,
    });
    expect(poller.tickOnce).toHaveBeenCalled();
  });

  test('Tests that the status keeps what it was when /track does not settle a found delivery', async () => {
    const stored = purchase({
      status: SwapStatusEnum.Failed,
      observedDepositTxHash: DEPOSIT_HASH,
    });
    const found = { ...stored, destinationTxHash: DELIVERY_HASH };
    const { service, poller, upsert, track } = harness(
      stored,
      found,
      jest.fn(async () => ({ status: 'swapping', trackingStatus: 'swapping' })),
    );

    const updated = await service.backfillFinishedRecord('rec-1');

    expect(track).toHaveBeenCalled();
    expect(updated?.status).toBe(SwapStatusEnum.Failed);
    expect(updated?.destinationTxHash).toBe(DELIVERY_HASH);
    expect(upsert).toHaveBeenCalled();
    expect(poller.tickOnce).not.toHaveBeenCalled();
  });

  test('Tests that Midgard is not asked when the record has its delivery', async () => {
    const { service, poller } = harness(
      purchase({
        status: SwapStatusEnum.Completed,
        destinationTxHash: DELIVERY_HASH,
      }),
      null,
    );

    await service.backfillFinishedRecord('rec-1');

    expect(poller.discoverViaMidgard).not.toHaveBeenCalled();
  });

  test('Tests that Midgard is not asked when the provider is not on it', async () => {
    const { service, poller } = harness(
      purchase({ provider: SwapKitProviderEnum.Near }),
      null,
    );

    await service.backfillFinishedRecord('rec-1');

    expect(poller.discoverViaMidgard).not.toHaveBeenCalled();
  });

  test('Tests that Midgard is not asked when the swap has not finished', async () => {
    const { service, poller } = harness(
      purchase({ status: SwapStatusEnum.Pending }),
      null,
    );

    await service.backfillFinishedRecord('rec-1');

    expect(poller.discoverViaMidgard).not.toHaveBeenCalled();
  });
});
