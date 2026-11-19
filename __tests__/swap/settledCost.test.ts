import {
  inputUsd,
  settledCostFrom,
  settledFeesUsd,
} from '@app/swap/settledCost';
import { applyDefaultTrackUpdate } from '@app/swap/providers/trackUpdateBase';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import type { TrackResponseType } from '@app/swap/types/TrackResponseType';

/**
 * The figures are a NEAR sale of 0.0067 ZEC for BTC as SwapKit's `/track`
 * reported it on 2026-11-03: the quote expected a larger BTC network fee than
 * the one charged, and priced the input differently from the wallet's feed.
 */

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

const record = (overrides: Partial<SwapRecordType> = {}): SwapRecordType =>
  ({
    recordId: 'rec-1',
    depositAddress: 't1deposit',
    provider: SwapKitProviderEnum.Near,
    direction: SwapDirectionEnum.Outbound,
    routeId: 'route-1',
    sellAsset: ZEC,
    receiveAsset: BTC,
    sellAmountHumanDecimal: '0.0067',
    expectedReceiveAmount: '0.00008445',
    actualReceiveAmount: '0.0000848',
    minReceiveAmount: '0.0000819',
    destinationAddress: 'bc1qdestination',
    sourceAddress: 't1ephemeral',
    status: SwapStatusEnum.Pending,
    fiatValueBasis: {
      sellUsdUnitPrice: 1210,
      receiveUsdUnitPrice: 77700,
      capturedAt: 0,
    },
    totalFeesInReceiveAsset: '0.0000272',
    ...overrides,
  }) as SwapRecordType;

const tracked: TrackResponseType = {
  status: 'completed',
  trackingStatus: 'completed',
  toAmount: '0.0000848',
  meta: {
    amountInUsd: '8.15',
    amountOutUsd: '6.58',
    fees: [
      { type: 'affiliate', amount: '0.0000335', asset: 'ZEC.ZEC' },
      { type: 'service', amount: '0.00001005', asset: 'ZEC.ZEC' },
      { type: 'outbound', amount: '0.000019', asset: 'BTC.BTC' },
    ],
  },
};

test('Tests that a completed swap keeps the fees and USD values SwapKit settled it at when it is tracked', () => {
  const next = applyDefaultTrackUpdate(record(), tracked);

  expect(next.settledCost).toEqual({
    inUsd: 8.15,
    outUsd: 6.58,
    fees: [
      { type: 'affiliate', amount: '0.0000335', asset: 'ZEC.ZEC' },
      { type: 'service', amount: '0.00001005', asset: 'ZEC.ZEC' },
      { type: 'outbound', amount: '0.000019', asset: 'BTC.BTC' },
    ],
  });
});

test('Tests that a swap in flight keeps no settled cost when the response already carries USD values', () => {
  const next = applyDefaultTrackUpdate(record(), {
    ...tracked,
    status: 'pending',
    trackingStatus: 'swapping',
  });

  expect(next.settledCost).toBeUndefined();
});

test('Tests that the fees read in USD at the settled prices when the swap has completed. The BTC network fee charged was lower than the quoted one.', () => {
  const cost = settledCostFrom(tracked);
  if (!cost) {
    throw new Error('no settled cost');
  }

  expect(settledFeesUsd(record(), cost)).toBeCloseTo(1.53, 2);
});

test('Tests that the input is worth its settled value once the swap completed and its quoted value before', () => {
  expect(inputUsd(record())).toBeCloseTo(8.107, 3);
  const cost = settledCostFrom(tracked);
  expect(inputUsd(record({ settledCost: cost }))).toBe(8.15);
});

test('Tests that a response without USD values carries no settled cost', () => {
  expect(settledCostFrom({ status: 'completed', meta: {} })).toBeUndefined();
});
