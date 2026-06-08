/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import Info from '../components/Info';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { CurrencyEnum, RouteEnum } from '../app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
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
  // regression: the ZEC price block was removed from Server Info — it must
  // not render anywhere on this screen, regardless of currency settings.
  test('Info - no ZEC price shown (us locale)', () => {
    const state = { ...defaultAppContextLoaded };
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.currency = CurrencyEnum.USDCurrency;
    const props = makeDrawerProps();
    render(
      <ContextAppLoadedProvider value={state}>
        <Info {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(screen.queryByText('$ 33.33')).toBeNull();
  });
});
