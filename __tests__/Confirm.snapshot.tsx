/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider, createStore } from 'jotai';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { priceAtom } from '../app/AppState/priceAtoms';

import Confirm from '../components/Send/components/Confirm';
import { CurrencyEnum, ModeEnum, RouteEnum } from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockSecurity } from '../__mocks__/dataMocks/mockSecurity';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Confirm
> {
  return {
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
        nym: false,
      },
    },
  };
}

describe('Confirm - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.server = mockServer;
  // sendConfirm disabled here so the on-mount biometric gate in Confirm.tsx
  // stays inactive and the snapshot captures the actual Confirm UI rather
  // than the auth placeholder.
  state.security = { ...mockSecurity, sendConfirm: false };
  state.currency = CurrencyEnum.noCurrency;
  state.mode = ModeEnum.advanced;
  state.defaultUnifiedAddress = 'u1abc123def456abc123def456abc123def456abc123';

  // The live price reads from its own atom; seed it in the store the Provider
  // hands the tree, not on the context.
  const store = createStore();
  store.set(priceAtom, {
    kind: 'priced',
    usd: mockZecPrice.zecPrice,
    at: mockZecPrice.date,
  });

  test('Confirm no currency, privacy off', () => {
    state.privacy = false;
    state.currency = CurrencyEnum.noCurrency;
    expect(
      render(
        <Provider store={store}>
          <ContextAppLoadedProvider value={state}>
            <Confirm {...makeProps()} />
          </ContextAppLoadedProvider>
        </Provider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('Confirm USD currency, privacy on', () => {
    state.privacy = true;
    state.currency = CurrencyEnum.USDCurrency;
    expect(
      render(
        <Provider store={store}>
          <ContextAppLoadedProvider value={state}>
            <Confirm {...makeProps()} />
          </ContextAppLoadedProvider>
        </Provider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
