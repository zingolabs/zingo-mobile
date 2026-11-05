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
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import SwapDetail from '@screens/SwapDetail/SwapDetail';

const expiredPurchase = (provider: SwapKitProviderEnum) =>
  ({
    recordId: 'rec-1',
    depositAddress: 'bc1qvaultaddressthatsaysnothing',
    sourceAddress: 'bc1quseraddressgiveninthequote',
    destinationAddress: 't1wallet',
    provider,
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
    status: SwapStatusEnum.Expired,
    fiatValueBasis: { sellUsdUnitPrice: 0, receiveUsdUnitPrice: 0 },
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_000_000,
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

describe.each([
  SwapKitProviderEnum.MayachainStreaming,
  SwapKitProviderEnum.ThorchainStreaming,
])('an expired %s purchase', provider => {
  test('Tests that it shows the address the user gave and no vault when its deposit was not found', () => {
    renderDetail(expiredPurchase(provider));

    expect(screen.getByText('swap.your-address')).toBeTruthy();
    expect(screen.queryByText('swap.deposit-address')).toBeNull();
    expect(screen.queryByTestId('swap.detail.dont-send')).toBeNull();
    expect(screen.getByText('swap.expired-why-vault')).toBeTruthy();
  });

  test('Tests that no hash can be entered when its deposit was not found', () => {
    renderDetail(expiredPurchase(provider));

    expect(screen.queryByTestId('swap.detail.hash')).toBeNull();
    expect(screen.queryByText('swap.deposit-follow')).toBeNull();
  });
});

const unsentSale = (provider: SwapKitProviderEnum) =>
  ({
    ...expiredPurchase(provider),
    direction: SwapDirectionEnum.Outbound,
    status: SwapStatusEnum.PendingDeposit,
    providerData: {},
    sellAsset: {
      swapKitId: 'ZEC.ZEC',
      chain: 'ZEC',
      symbol: 'ZEC',
      ticker: 'ZEC',
      chainId: 'zcash',
      decimals: 8,
    },
  }) as unknown as SwapRecordType;

test.each([
  SwapKitProviderEnum.MayachainStreaming,
  SwapKitProviderEnum.ThorchainStreaming,
])('Tests that an unsent %s sale shows no way to pay it by hand', provider => {
  renderDetail(unsentSale(provider));

  expect(screen.getByText('swap.deposit-unsent-title')).toBeTruthy();
  expect(screen.queryByTestId('swap.deposit.address')).toBeNull();
});

test('Tests that an unsent NEAR sale keeps its slip', () => {
  renderDetail(unsentSale(SwapKitProviderEnum.Near));

  expect(screen.getByTestId('swap.deposit.address')).toBeTruthy();
});

test('Tests that an expired NEAR purchase keeps its own deposit address and no hash field', () => {
  renderDetail(expiredPurchase(SwapKitProviderEnum.Near));

  expect(screen.getByText('swap.deposit-address')).toBeTruthy();
  expect(screen.getByTestId('swap.detail.dont-send')).toBeTruthy();
});
