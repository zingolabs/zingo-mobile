jest.mock('@app/RPCModule', () => ({ __esModule: true, default: {} }));

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
import DepositSlip from '@screens/Swap/components/DepositSlip';

const usdtPurchase = (memo: string | undefined) =>
  ({
    recordId: 'rec-1',
    depositAddress: '0xd84379da1bcf7db871313cab1d93dd23ab3a076f',
    destinationAddress: 't1wallet',
    provider: SwapKitProviderEnum.MayachainStreaming,
    direction: SwapDirectionEnum.Inbound,
    routeId: 'route-1',
    sellAsset: {
      swapKitId: 'ETH.USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
      chain: 'ETH',
      symbol: 'USDT-0XDAC17F958D2EE523A2206206994597C13D831EC7',
      ticker: 'USDT',
      chainId: '1',
      decimals: 6,
    },
    receiveAsset: {
      swapKitId: 'ZEC.ZEC',
      chain: 'ZEC',
      symbol: 'ZEC',
      ticker: 'ZEC',
      chainId: 'zcash',
      decimals: 8,
    },
    sellAmountHumanDecimal: '65.076',
    expectedReceiveAmount: '0.06',
    minReceiveAmount: '0.059',
    status: SwapStatusEnum.AwaitingExternalDeposit,
    providerData: memo ? { memo } : undefined,
    fiatValueBasis: { sellUsdUnitPrice: 0, receiveUsdUnitPrice: 0 },
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_000_000,
  }) as unknown as SwapRecordType;

const renderSlip = (record: SwapRecordType) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <DepositSlip record={record} />
    </ContextAppLoadedProvider>,
  );

describe('DepositSlip for a token', () => {
  test('Tests that one banner asks for a memo wallet and the network when the token deposit has a memo', () => {
    renderSlip(usdtPurchase('=:ZEC.ZEC:t1wallet'));
    expect(screen.getByTestId('swap.deposit.network-memo')).toBeOnTheScreen();
    expect(screen.getByText('swap.network-memo-only')).toBeOnTheScreen();
    expect(screen.queryByTestId('swap.deposit.no-qr')).toBeNull();
    expect(screen.queryByText('swap.network-only')).toBeNull();
  });

  test('Tests that only the network banner shows when the token deposit has no memo', () => {
    renderSlip(usdtPurchase(undefined));
    expect(screen.getByText('swap.network-only')).toBeOnTheScreen();
    expect(screen.queryByTestId('swap.deposit.network-memo')).toBeNull();
  });
});
