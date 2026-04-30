/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { MessagesAddress } from '../components/Messages';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { CurrencyEnum, ModeEnum, RouteEnum } from '../app/AppState';
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
  RouteEnum.MessagesAddress
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.MessagesAddress,
      params: undefined,
    },
  };
}

// test suite
describe('Component Messages Address - test', () => {
  //snapshot test
  const state = { ...defaultAppContextLoaded };
  state.valueTransfers = mockValueTransfers;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;

  test('Messages Address no currency, privacy normal & mode basic - snapshot', () => {
    state.currency = CurrencyEnum.noCurrency;
    state.privacy = false;
    state.mode = ModeEnum.basic;
    const props = makeDrawerProps();
    const messages = render(
      <ContextAppLoadedProvider value={state}>
        <MessagesAddress {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(messages.toJSON()).toMatchSnapshot();
  });
});
