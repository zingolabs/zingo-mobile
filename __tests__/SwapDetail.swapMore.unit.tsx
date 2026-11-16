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
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { AddressBookFileClass, ChainNameEnum } from '@app/AppState';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import SwapDetail from '@screens/SwapDetail/SwapDetail';

const BTC = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};
const ZEC = {
  swapKitId: 'ZEC.ZEC',
  chain: 'ZEC',
  symbol: 'ZEC',
  ticker: 'ZEC',
  chainId: 'zcash',
  decimals: 8,
};
const BTC_ADDRESS = 'bc1qhthtge6p4c00f9fhwjzeyl4p4untk4usxehn9m';

const swap = (direction: SwapDirectionEnum) =>
  ({
    recordId: 'rec-1',
    depositAddress: 'vault',
    sourceAddress: direction === SwapDirectionEnum.Inbound ? BTC_ADDRESS : '',
    destinationAddress:
      direction === SwapDirectionEnum.Outbound ? BTC_ADDRESS : 't1wallet',
    provider: SwapKitProviderEnum.MayachainStreaming,
    direction,
    routeId: 'route-1',
    sellAsset: direction === SwapDirectionEnum.Outbound ? ZEC : BTC,
    receiveAsset: direction === SwapDirectionEnum.Outbound ? BTC : ZEC,
    sellAmountHumanDecimal: '0.017',
    expectedReceiveAmount: '0.00028602',
    minReceiveAmount: '0.00028',
    status: SwapStatusEnum.Completed,
    fiatValueBasis: { sellUsdUnitPrice: 0, receiveUsdUnitPrice: 0 },
    createdAtMs: 1_700_000_000_000,
    updatedAtMs: 1_700_000_000_000,
  }) as unknown as SwapRecordType;

const contact = new AddressBookFileClass(
  'Cold',
  BTC_ADDRESS,
  '#fff',
  false,
  ChainNameEnum.mainChainName,
  'BTC',
);

const renderDetail = (
  record: SwapRecordType,
  addressBook: AddressBookFileClass[],
) => {
  mockRecord = record;
  const navigate = jest.fn();
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        addressBook,
        translate: (k: string) => k,
      }}
    >
      <SwapDetail
        navigation={{ canGoBack: () => false, navigate } as never}
        route={{ params: { recordId: record.recordId } } as never}
      />
    </ContextAppLoadedProvider>,
  );
  return navigate;
};

test.each([
  [SwapDirectionEnum.Outbound, BTC],
  [SwapDirectionEnum.Inbound, BTC],
])(
  'Tests that Swap more opens a %s swap with the saved address and no amount when the swap address is a contact',
  (direction, asset) => {
    const navigate = renderDetail(swap(direction), [contact]);

    fireEvent.press(screen.getByTestId('swap.detail.swap-more'));

    expect(navigate).toHaveBeenCalledWith(
      'Home',
      {
        screen: 'Swap',
        params: {
          prefill: expect.objectContaining({
            direction,
            asset,
            address: BTC_ADDRESS,
            sellAmountHumanDecimal: '',
          }),
        },
      },
      { pop: true },
    );
  },
);

test('Tests that Save contact takes the place of Swap more when the swap address is not saved', () => {
  renderDetail(swap(SwapDirectionEnum.Outbound), []);

  expect(screen.getByTestId('swap.detail.save-contact')).toBeTruthy();
  expect(screen.queryByTestId('swap.detail.swap-more')).toBeNull();
});

test('Tests that Swap more is hidden when the wallet is read-only', () => {
  mockRecord = swap(SwapDirectionEnum.Outbound);
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        addressBook: [contact],
        readOnly: true,
        translate: (k: string) => k,
      }}
    >
      <SwapDetail
        navigation={{ canGoBack: () => false } as never}
        route={{ params: { recordId: 'rec-1' } } as never}
      />
    </ContextAppLoadedProvider>,
  );

  expect(screen.queryByTestId('swap.detail.swap-more')).toBeNull();
});
