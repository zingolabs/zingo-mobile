/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import History from '../components/History';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { CurrencyEnum, RouteEnum } from '../app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.History
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.History,
      params: undefined,
    },
  };
}
jest.mock('../assets/icons/paper-plane.svg', () => 'PaperPlane');
jest.mock('../assets/icons/qr.svg', () => 'QrCode');
jest.mock('../assets/icons/faucet.svg', () => 'FaucetIcon');
// test suite
describe('Component History - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.valueTransfers = mockValueTransfers;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const onFunction = jest.fn();

  test('History no currency, privacy normal & mode basic - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.noCurrency;
    // privacy normal
    state.privacy = false;
    // mode basic
    const props = makeDrawerProps();
    const history = render(
      <ContextAppLoadedProvider value={state}>
        <History
          {...props}
          toggleMenuDrawer={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          scrollToTop={false}
          setScrollToBottom={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(history.toJSON()).toMatchSnapshot();
  });

  test('History currency USD, privacy high & mode advanced - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.USDCurrency;
    // privacy normal
    state.privacy = true;
    // mode basic
    const props = makeDrawerProps();
    const history = render(
      <ContextAppLoadedProvider value={state}>
        <History
          {...props}
          toggleMenuDrawer={onFunction}
          setShieldingAmount={onFunction}
          setScrollToTop={onFunction}
          scrollToTop={false}
          setScrollToBottom={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(history.toJSON()).toMatchSnapshot();
  });
});
