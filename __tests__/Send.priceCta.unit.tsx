/**
 * Evidence tests for the PR 1343 review findings on the Send screen's
 * price surface. Each test encodes the behavior the finding says the
 * screen should have: it fails on the broken code and passes once the
 * finding is fixed.
 *
 * F7: an unattended refresh must not swap the send CTA away while a
 *     price is already on screen.
 * F8 (amount half): the in-form USD amounts dim when the price is stale.
 */
jest.mock('../components/Components/priceFetcherStore', () => ({
  __esModule: true,
  PRICE_REFRESH_MIN_MS: 5 * 60_000,
  PRICE_REFRESH_MAX_MS: 10 * 60_000,
  PRICE_STALE_MS: 10 * 60_000,
  priceFetcherStore: {
    setDeps: jest.fn(),
    attach: jest.fn(() => () => {}),
    subscribe: jest.fn(() => () => {}),
    snapshot: jest.fn(() => ({
      loading: false,
      cycle: 0,
      nextFetchAt: 0,
      nextFetchDelayMs: 0,
    })),
    foregroundReturned: jest.fn(),
    fetch: jest.fn(),
  },
  usePriceFetcherStore: jest.fn(() => ({
    loading: false,
    cycle: 0,
    nextFetchAt: 0,
    nextFetchDelayMs: 0,
  })),
  usePriceStale: jest.fn(() => false),
}));

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import Send from '../components/Send';
import Confirm from '../components/Send/components/Confirm';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { CurrencyEnum, ModeEnum, RouteEnum } from '../app/AppState';
import {
  usePriceFetcherStore,
  usePriceStale,
} from '../components/Components/priceFetcherStore';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const storeHook = usePriceFetcherStore as jest.MockedFunction<
  typeof usePriceFetcherStore
>;
const staleHook = usePriceStale as jest.MockedFunction<typeof usePriceStale>;

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Send
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Send,
      params: undefined,
    },
  };
}

const onFunction = jest.fn();
const sendUi = (zecPrice: { zecPrice: number; date: number }) => {
  const state = { ...defaultAppContextLoaded };
  state.valueTransfers = mockValueTransfers;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.server = mockServer;
  state.totalBalance = mockTotalBalance;
  state.sendPageState = mockSendPageState;
  state.currency = CurrencyEnum.USDCurrency;
  state.mode = ModeEnum.advanced;
  state.zecPrice = zecPrice;
  return (
    <ContextAppLoadedProvider value={state}>
      <Send
        {...makeDrawerProps()}
        sendTransaction={onFunction}
        clearToAddr={onFunction}
        toggleMenuDrawer={onFunction}
        setShieldingAmount={onFunction}
        setScrollToTop={onFunction}
        setScrollToBottom={onFunction}
        setServerOption={onFunction}
        setSecurityOption={onFunction}
      />
    </ContextAppLoadedProvider>
  );
};

beforeEach(() => {
  storeHook.mockReturnValue({
    loading: false,
    cycle: 0,
    nextFetchAt: 0,
    nextFetchDelayMs: 0,
  });
  staleHook.mockReturnValue(false);
  // Send's mount effects call these; the shared RPCModule mock lacks them.
  const { NativeModules } = require('react-native');
  NativeModules.RPCModule.getDonationAddress = jest.fn(async () => '{}');
});

test('F7: an unattended refresh keeps the send CTA while a price is on screen', () => {
  storeHook.mockReturnValue({
    loading: true,
    cycle: 0,
    nextFetchAt: 0,
    nextFetchDelayMs: 0,
  });
  const view = render(sendUi({ zecPrice: 33.33, date: Date.now() }));

  expect(view.queryByTestId('send.refreshing-price')).toBeNull();
  expect(
    view.queryByTestId('send.button') ??
      view.queryByTestId('send.button-disabled'),
  ).toBeTruthy();
});

test('N1: price loading never takes the send CTA, price or no price', () => {
  // Sending needs ZEC amounts, never the USD price; a bootstrapping
  // mixnet must not block sends for the length of every fetch flight.
  storeHook.mockReturnValue({
    loading: true,
    cycle: 0,
    nextFetchAt: 0,
    nextFetchDelayMs: 0,
  });
  const view = render(sendUi({ zecPrice: 0, date: 0 }));

  expect(view.queryByTestId('send.refreshing-price')).toBeNull();
  expect(
    view.queryByTestId('send.button') ??
      view.queryByTestId('send.button-disabled'),
  ).toBeTruthy();
});

test('F8: the in-form USD amounts dim when the price is stale', () => {
  staleHook.mockReturnValue(true);
  const view = render(
    sendUi({ zecPrice: 33.33, date: Date.now() - 11 * 60_000 }),
  );

  // The form rows render at 16 pt (amount) and 14 pt (spendable); the
  // header BalanceRow dims already and must not satisfy this test, and
  // the bare "$" input glyph (no trailing space) is not an amount.
  const { StyleSheet } = require('react-native');
  const formAmounts = view
    .getAllByText(/^\$ /)
    .map(t => StyleSheet.flatten(t.props.style))
    .filter(
      (s: { fontSize?: number }) => s.fontSize === 16 || s.fontSize === 14,
    );
  expect(formAmounts.length).toBeGreaterThan(0);
  formAmounts.forEach(s => expect(s.color).toBe('#888888'));
});

test('P8: an absent price dims the USD rows like the ring beside them', () => {
  staleHook.mockReturnValue(false); // not stale: the price never existed
  const view = render(sendUi({ zecPrice: 0, date: 0 }));

  const { StyleSheet } = require('react-native');
  const formAmounts = view
    .getAllByText(/^\$ /)
    .map(t => StyleSheet.flatten(t.props.style))
    .filter(
      (s: { fontSize?: number }) => s.fontSize === 16 || s.fontSize === 14,
    );
  expect(formAmounts.length).toBeGreaterThan(0);
  formAmounts.forEach(s => expect(s.color).toBe('#888888'));
});

test('N7: the send-confirmation conversions dim on a stale price too', () => {
  // The one screen where the figure drives a signing decision must not
  // show a stale conversion at full strength.
  staleHook.mockReturnValue(true);
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.server = mockServer;
  state.sendPageState = mockSendPageState;
  state.currency = CurrencyEnum.USDCurrency;
  state.mode = ModeEnum.advanced;
  state.zecPrice = { zecPrice: 33.33, date: Date.now() - 40 * 60_000 };
  state.security = { ...state.security, sendConfirm: false };
  const confirmProps = {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Confirm,
      params: {
        calculatedFee: 0.00001,
        proposalPools: { source: ['ironwood'], destination: ['ironwood'] },
        donationAmount: 0,
        confirmSend: jest.fn(async () => {}),
        sendAllAmount: false,
        calculateFeeWithPropose: jest.fn(async () => {}),
        sendPageState: mockSendPageState,
        nym: true,
      },
    },
  } as any;
  const view = render(
    <ContextAppLoadedProvider value={state}>
      <Confirm {...confirmProps} />
    </ContextAppLoadedProvider>,
  );

  const { StyleSheet } = require('react-native');
  const conversions = view
    .getAllByText(/^\$ /)
    .map(t => StyleSheet.flatten(t.props.style));
  expect(conversions.length).toBeGreaterThan(0);
  conversions.forEach(s => expect(s.color).toBe('#888888'));
});
