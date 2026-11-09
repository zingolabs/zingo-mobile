jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

let mockRecord: unknown;

jest.mock('@screens/Swap/useSwapRecord', () => ({
  useSwapRecord: () => mockRecord,
}));
jest.mock('@app/context', () => ({
  ...jest.requireActual('@app/context'),
  useSwapRecords: () => [],
  useSwapService: () => ({
    backfillFinishedRecord: jest.fn(async () => undefined),
  }),
}));

import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SwapDirectionEnum } from '@app/swap/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/SwapRecordType';
import SwapDetail from '@screens/SwapDetail/SwapDetail';

const completedPurchase = (overrides: Partial<SwapRecordType> = {}) =>
  ({
    recordId: 'rec-1',
    depositAddress: 'bc1qvault',
    sourceAddress: 'bc1quser',
    destinationAddress: 't1wallet',
    provider: SwapKitProviderEnum.ThorchainStreaming,
    direction: SwapDirectionEnum.Inbound,
    routeId: 'route-1',
    sellAsset: {
      swapKitId: 'BTC.BTC',
      chain: 'BTC',
      symbol: 'BTC',
      ticker: 'BTC',
      chainId: 'bitcoin',
      decimals: 8,
    },
    receiveAsset: {
      swapKitId: 'ZEC.ZEC',
      chain: 'ZEC',
      symbol: 'ZEC',
      ticker: 'ZEC',
      chainId: 'zcash',
      decimals: 8,
    },
    sellAmountHumanDecimal: '0.00024887',
    expectedReceiveAmount: '0.01477013',
    minReceiveAmount: '0.01432872',
    observedDepositTxHash: 'cd'.repeat(32),
    status: SwapStatusEnum.Completed,
    fiatValueBasis: { sellUsdUnitPrice: 0, receiveUsdUnitPrice: 0 },
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_000_000,
    ...overrides,
  }) as unknown as SwapRecordType;

const renderDetail = (record: SwapRecordType) => {
  mockRecord = record;
  return render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <SwapDetail
        navigation={{ canGoBack: () => false } as never}
        route={{ params: { recordId: record.recordId } } as never}
      />
    </ContextAppLoadedProvider>,
  );
};

test('Tests that a completed purchase warns when it has no ZEC transaction.', () => {
  renderDetail(completedPurchase());

  expect(screen.getByTestId('swap.detail.no-delivery')).toBeTruthy();
  expect(screen.queryByText('swap.delivery-tx')).toBeNull();
});

test('Tests that a completed purchase shows its ZEC transaction and no warning when it has one.', () => {
  renderDetail(completedPurchase({ destinationTxHash: 'ef'.repeat(32) }));

  expect(screen.getByText('swap.delivery-tx')).toBeTruthy();
  expect(screen.queryByTestId('swap.detail.no-delivery')).toBeNull();
});

test('Tests that a NEAR purchase does not warn when it has no ZEC transaction.', () => {
  renderDetail(completedPurchase({ provider: SwapKitProviderEnum.Near }));

  expect(screen.queryByTestId('swap.detail.no-delivery')).toBeNull();
});
