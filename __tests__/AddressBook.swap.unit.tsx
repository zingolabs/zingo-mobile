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
import { SwapDirectionEnum } from '@app/swap';
import type { TokenEntryType } from '@app/swap';
import { chainCoin } from '@screens/Swap/swapAssets';
import en from '@app/translations/en.json';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

let mockSwapService: {
  listRoutableTokens: (direction: string) => Promise<TokenEntryType[]>;
} | null;
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

const token = (
  identifier: string,
  ticker: string,
  address?: string,
): TokenEntryType => ({
  chain: identifier.split('.')[0],
  chainId: '1',
  ticker,
  identifier,
  symbol: identifier.split('.')[1],
  name: ticker,
  decimals: 8,
  address,
});

const BTC = token('BTC.BTC', 'BTC');
const GRAM = token('TON.GRAM', 'GRAM');
const ETH = token('ETH.ETH', 'ETH');
const USDC = token('ETH.USDC-0xa0b8', 'USDC', '0xa0b8');

const contact = (label: string, address: string, swapChain: string) =>
  new AddressBookFileClass(
    label,
    address,
    '#FFFFFF',
    false,
    ChainNameEnum.mainChainName,
    swapChain,
  );

const ana = 'bc1qanaanaanaanaanaana0wlh';
const book = [
  contact('Ana', ana, 'BTC'),
  contact('Lolo', 'u1lolo', 'ZEC'),
  contact('Xmr', '4xmr', 'XMR'),
  contact('Eve', '0xeve', 'ETH'),
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

const openSheet = async (address: string) => {
  await act(async () => {
    fireEvent.press(screen.getByTestId(`addressbook.row.${address}.swap`));
  });
};

describe('AddressBook swap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSwapService = { listRoutableTokens: async () => [BTC, GRAM] };
    mockNavigation.navigate.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('Tests that a contact on another coin offers Swap and a Zcash one offers Send when the Swap tab exists.', () => {
    renderBook();
    expect(screen.getByTestId(`addressbook.row.${ana}.swap`)).toBeTruthy();
    expect(screen.queryByTestId('addressbook.row.u1lolo.swap')).toBeNull();
    expect(screen.getByTestId('addressbook.row.u1lolo.send')).toBeTruthy();
  });

  test('Tests that Swap is absent when the swap service is not up.', () => {
    mockSwapService = null;
    renderBook();
    expect(screen.queryByTestId(`addressbook.row.${ana}.swap`)).toBeNull();
  });

  test('Tests that Swap is absent when the wallet cannot spend.', () => {
    renderBook(true);
    expect(screen.queryByTestId(`addressbook.row.${ana}.swap`)).toBeNull();
  });

  test('Tests that the sheet says there is no route when the catalog has no coin for the chain.', async () => {
    renderBook();
    await openSheet('4xmr');
    expect(screen.getByTestId('addressbook.swap.none')).toBeTruthy();
    expect(screen.queryByTestId('addressbook.swap.to')).toBeNull();
    expect(screen.queryByTestId('addressbook.swap.from')).toBeNull();
  });

  test('Tests that the sheet says there is no route when the catalog cannot be read.', async () => {
    mockSwapService = {
      listRoutableTokens: async () => {
        throw new Error('down');
      },
    };
    renderBook();
    await openSheet(ana);
    expect(screen.getByTestId('addressbook.swap.none')).toBeTruthy();
  });

  test('Tests that the sheet offers only the direction the catalog routes.', async () => {
    mockSwapService = {
      listRoutableTokens: async direction =>
        direction === 'inbound' ? [BTC] : [],
    };
    renderBook();
    await openSheet(ana);
    expect(screen.queryByTestId('addressbook.swap.to')).toBeNull();
    expect(screen.getByTestId('addressbook.swap.from')).toBeTruthy();
  });

  test('Tests that the rows name the coin when the chain has only one.', async () => {
    renderBook();
    await openSheet(ana);
    expect(screen.getByText('Swap to BTC')).toBeTruthy();
    expect(screen.getByText('Swap from BTC')).toBeTruthy();
  });

  test('Tests that the rows name no coin when the chain has several, and still open Swap.', async () => {
    mockSwapService = { listRoutableTokens: async () => [USDC, ETH] };
    renderBook();
    await openSheet('0xeve');
    expect(screen.getByText('Swap to')).toBeTruthy();
    expect(screen.getByText('Swap from')).toBeTruthy();
    for (const row of ['addressbook.swap.to', 'addressbook.swap.from']) {
      expect(screen.getByTestId(row)).not.toHaveTextContent(/ETH|USDC/);
    }

    fireEvent.press(screen.getByTestId('addressbook.swap.to'));
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(mockNavigation.navigate).toHaveBeenCalledWith(
      Route.Home,
      {
        screen: Route.Swap,
        params: {
          prefill: expect.objectContaining({
            asset: expect.objectContaining({ swapKitId: 'ETH.ETH' }),
            address: '0xeve',
          }),
        },
      },
      { pop: true },
    );
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
    async (row, direction, message) => {
      const snackbar = renderBook();
      await openSheet(ana);
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
              asset: expect.objectContaining({ swapKitId: 'BTC.BTC' }),
              address: ana,
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

describe('chainCoin', () => {
  const usdc = token('ETH.USDC-0xA0b8', 'USDC', '0xA0b8');
  const eth = token('ETH.ETH', 'ETH');

  test('Tests that the coin is the entry with no contract when the chain also lists tokens.', () => {
    expect(chainCoin([usdc, eth], 'ETH')).toBe(eth);
  });

  test('Tests that the coin comes from the catalog when it is not named after the chain.', () => {
    expect(chainCoin([GRAM], 'ton')).toBe(GRAM);
  });

  test('Tests that the first token is the coin when the chain routes only tokens.', () => {
    const hypeUsdc = token('HYPE.USDC-USDC:0x6d1e', 'USDC', '0x6d1e');
    const hypeWnear = token('HYPE.wNEAR-0x20b8', 'wNEAR', '0x20b8');
    expect(chainCoin([hypeUsdc, hypeWnear], 'HYPE')).toBe(hypeUsdc);
  });

  test('Tests that wrapped ZEC is not the coin when it is all the chain lists.', () => {
    const wrapped = token('STRK.ZEC-0x05ce', 'ZEC', '0x05ce');
    expect(chainCoin([wrapped], 'STRK')).toBeUndefined();
  });

  test('Tests that there is no coin when the catalog does not list the chain.', () => {
    expect(chainCoin([eth], 'XMR')).toBeUndefined();
  });
});
