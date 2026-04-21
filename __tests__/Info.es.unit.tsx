/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import Info from '../components/Info';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '../app/context';
import { CurrencyEnum, RouteEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// don't delete -> mocking in Spanish.
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: ',', // es
      groupingSeparator: '.', // es
    };
  },
}));

function makeDrawerProps(): DrawerScreenProps<
  AppDrawerParamList,
  RouteEnum.Info
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Info,
      params: undefined,
    },
  };
}
// test suite
describe('Component Info - test', () => {
  //unit test
  test('Info - price with es (,) decimal point', () => {
    const state = defaultAppContextLoaded;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.currency = CurrencyEnum.USDCurrency;
    const props = makeDrawerProps();
    render(
      <ContextAppLoadedProvider value={state}>
        <Info {...props} />
      </ContextAppLoadedProvider>,
    );
    screen.getByText('$ 33,33');
  });
});
