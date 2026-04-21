/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, RenderResult } from '@testing-library/react-native';
import Info from '../components/Info';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

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
  //snapshot test
  test('Info - snapshot', () => {
    const state = { ...defaultAppContextLoaded };
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.translate = mockTranslate;
    state.totalBalance = mockTotalBalance;
    const props = makeDrawerProps();
    const info: RenderResult = render(
      <ContextAppLoadedProvider value={state}>
        <Info {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(info.toJSON()).toMatchSnapshot();
  });
});
