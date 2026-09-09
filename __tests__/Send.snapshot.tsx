/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Send from '@screens/Send';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { ModeEnum, CurrencyEnum, RouteEnum } from '@app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSendPageState from '../__mocks__/dataMocks/mockSendPageState';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

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
// test suite
describe('Component Send - test', () => {
  //snapshot test
  const state = { ...defaultAppContextLoaded };
  state.valueTransfers = mockValueTransfers;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.zecPrice = mockZecPrice;
  state.totalBalance = mockTotalBalance;
  // The price ring renders only for a Nym-consenting session.
  state.nym = true;
  state.sendPageState = mockSendPageState;
  const onFunction = jest.fn();

  test('Send no currency, privacy normal & mode basic - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.noCurrency;
    // privacy normal
    state.privacy = false;
    // mode basic
    state.mode = ModeEnum.basic;
    const props = makeDrawerProps();
    const send = render(
      <ContextAppLoadedProvider value={state}>
        <Send
          {...props}
          sendTransaction={onFunction}
          clearToAddr={onFunction}
          toggleMenuDrawer={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          setScrollToBottom={onFunction}
          setServerOption={onFunction}
          setSecurityOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(send.toJSON()).toMatchSnapshot();
  });

  test('Send currency USD, privacy high & mode advanced - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.USDCurrency;
    // privacy normal
    state.privacy = true;
    // mode basic
    state.mode = ModeEnum.advanced;
    const props = makeDrawerProps();
    const send = render(
      <ContextAppLoadedProvider value={state}>
        <Send
          {...props}
          sendTransaction={onFunction}
          clearToAddr={onFunction}
          toggleMenuDrawer={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          setScrollToBottom={onFunction}
          setServerOption={onFunction}
          setSecurityOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(send.toJSON()).toMatchSnapshot();
  });
});
