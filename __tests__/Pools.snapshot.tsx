/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Pools from '../components/Pools';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): DrawerScreenProps<AppDrawerParamList, RouteEnum.Pools> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Pools,
      params: undefined,
    },
  };
}
// test suite
describe('Component Pools - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const props = makeDrawerProps();
  test('Pools - snapshot', () => {
    const pools = render(
      <ContextAppLoadedProvider value={state}>
        <Pools {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(pools.toJSON()).toMatchSnapshot();
  });
});
