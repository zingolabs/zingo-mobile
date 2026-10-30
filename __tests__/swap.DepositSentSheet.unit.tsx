import 'react-native';
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import * as sheetLib from '@gorhom/bottom-sheet';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

/** The mock's modal methods (__mocks__/@gorhom/bottom-sheet.js). */
const { sheetMethods } = sheetLib as unknown as {
  sheetMethods: { dismiss: jest.Mock };
};
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';
import type { SwapRecordType } from '@app/swap/types/SwapRecordType';
import DepositSentSheet from '@screens/Swap/components/DepositSentSheet';
import Utils from '@app/utils';

const record = {
  recordId: 'rec-1',
  depositAddress: 'bc1qdepositaddressxyz',
  provider: SwapKitProviderEnum.Near,
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
  sellAmountHumanDecimal: '0.00015000',
  expectedReceiveAmount: '0.0088',
  minReceiveAmount: '0.0087',
  destinationAddress: 't1dest',
  sourceAddress: 'bc1qrefund',
  status: SwapStatusEnum.AwaitingExternalDeposit,
  providerData: {
    kind: SwapKitProviderEnum.Near,
    depositAddress: 'bc1qdepositaddressxyz',
  },
  fiatValueBasis: {
    sellUsdUnitPrice: 60000,
    receiveUsdUnitPrice: 1300,
    capturedAt: 0,
  },
  createdAtMs: 1,
  updatedAtMs: 1,
} as SwapRecordType;

const sheet = () => {
  const order: string[] = [];
  const ref = React.createRef<BottomSheetModal>();
  sheetMethods.dismiss.mockImplementation(() => order.push('dismiss'));
  const view = render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) =>
          key === 'swap.sent-confirm-body'
            ? 'Confirm you sent exactly {amount} {coin} to {address} from your other wallet.'
            : key,
      }}
    >
      <DepositSentSheet
        ref={ref}
        record={record}
        onConfirm={async () => {
          order.push('confirm');
        }}
        onConfirmed={() => order.push('confirmed')}
      />
    </ContextAppLoadedProvider>,
  );
  return { view, order };
};

test('Tests that the sheet names the exact amount, the coin and the short deposit address', () => {
  const { view } = sheet();

  expect(view.getByText('0.00015 BTC')).toBeTruthy();
  expect(
    view.getByText(Utils.trimToSmall('bc1qdepositaddressxyz', 6)),
  ).toBeTruthy();
});

test('Tests that Yes marks the deposit, closes the sheet, then hands over to the tracking', async () => {
  const { view, order } = sheet();

  await act(async () => {
    fireEvent.press(view.getByTestId('swap.sent-confirm.yes'));
  });

  expect(order).toEqual(['confirm', 'dismiss', 'confirmed']);
});

test('Tests that Not yet only closes the sheet', () => {
  const { view, order } = sheet();

  fireEvent.press(view.getByTestId('swap.sent-confirm.no'));

  expect(order).toEqual(['dismiss']);
});
