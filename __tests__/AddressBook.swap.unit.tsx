/**
 * @format
 */
import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { OptionsPanelProvider } from '@app/context/optionsPanel';
import { AddressBook } from '@screens/AddressBook';
import { AddressBookFileClass, ChainNameEnum, Route } from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { SwapDirectionEnum, chainNativeAsset } from '@app/swap';
import en from '@app/translations/en.json';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

let mockSwapService: object | null = {};
jest.mock('@app/context', () => ({
  ...jest.requireActual('@app/context'),
  useSwapService: () => mockSwapService,
}));

const translate = (key: string) => {
  const [section, name] = key.split('.');
  const group = (en as unknown as Record<string, Record<string, string>>)[
    section
  ];
  return group?.[name] ?? key;
};

const contact = (label: string, address: string, swapChain: string) =>
  new AddressBookFileClass(
    label,
    address,
    '#FFFFFF',
    false,
    ChainNameEnum.mainChainName,
    swapChain,
  );

const book = [
  contact('Ana', 'bc1qanaanaanaanaanaana0wlh', 'BTC'),
  contact('Lolo', 'u1lolo', 'ZEC'),
  contact('Xmr', '4xmr', 'XMR'),
];

const renderBook = (readOnly = false) => {
  const addLastSnackbar = jest.fn();
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate,
        addressBook: book,
        addLastSnackbar,
        readOnly,
        walletChainName: ChainNameEnum.mainChainName,
        server: remoteServer(
          'https://example.test:443',
          ChainNameEnum.mainChainName,
        ),
      }}
    >
      <OptionsPanelProvider>
        <AddressBook
          navigation={mockNavigation}
          route={{ key: 'Key-1', name: 'AddressBook', params: undefined }}
        />
      </OptionsPanelProvider>
    </ContextAppLoadedProvider>,
  );
  return addLastSnackbar;
};

const swapId = 'addressbook.row.bc1qanaanaanaanaanaana0wlh.swap';

describe('AddressBook swap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSwapService = {};
    mockNavigation.navigate.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Tests that a contact on another coin offers Swap and a Zcash one offers Send when the Swap tab exists.', () => {
    renderBook();
    expect(screen.getByTestId(swapId)).toBeTruthy();
    expect(screen.queryByTestId('addressbook.row.u1lolo.swap')).toBeNull();
    expect(screen.getByTestId('addressbook.row.u1lolo.send')).toBeTruthy();
  });

  test('Tests that Swap is absent when the swap service is not up.', () => {
    mockSwapService = null;
    renderBook();
    expect(screen.queryByTestId(swapId)).toBeNull();
  });

  test('Tests that Swap is absent when the wallet cannot spend.', () => {
    renderBook(true);
    expect(screen.queryByTestId(swapId)).toBeNull();
  });

  test('Tests that Swap is absent when the chain has no coin that swaps with ZEC.', () => {
    renderBook();
    expect(screen.queryByTestId('addressbook.row.4xmr.swap')).toBeNull();
    expect(screen.getByTestId('addressbook.row.4xmr.copy')).toBeTruthy();
  });

  test.each([
    [
      'addressbook.swap.to',
      SwapDirectionEnum.Outbound,
      'Swap to BTC: Ana is the destination',
    ],
    [
      'addressbook.swap.from',
      SwapDirectionEnum.Inbound,
      'Swap from BTC: Ana is the refund address',
    ],
  ])(
    'Tests that %s opens Swap filled in that direction with the contact and an empty amount.',
    (row, direction, message) => {
      const snackbar = renderBook();
      fireEvent.press(screen.getByTestId(swapId));
      expect(screen.getByTestId('addressbook.swap.address')).toHaveTextContent(
        /Bitcoin address$/,
      );
      fireEvent.press(screen.getByTestId(row));
      act(() => {
        jest.runOnlyPendingTimers();
      });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Route.Home,
        {
          screen: Route.Swap,
          params: {
            prefill: expect.objectContaining({
              direction,
              asset: chainNativeAsset('BTC'),
              address: 'bc1qanaanaanaanaanaana0wlh',
              sellAmountHumanDecimal: '',
            }),
          },
        },
        { pop: true },
      );
      expect(snackbar).toHaveBeenCalledWith(message, expect.anything());
    },
  );
});

describe('chainNativeAsset', () => {
  test('Tests that the coin is the one the chain pays in when it is not named after the chain.', () => {
    expect(chainNativeAsset('TON')?.swapKitId).toBe('TON.GRAM');
    expect(chainNativeAsset('BASE')?.swapKitId).toBe('BASE.ETH');
    expect(chainNativeAsset('btc')?.swapKitId).toBe('BTC.BTC');
    expect(chainNativeAsset('XMR')).toBeUndefined();
  });
});
