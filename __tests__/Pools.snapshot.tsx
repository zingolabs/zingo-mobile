/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { Provider } from 'jotai';
import { balanceAtom } from '@app/AppState/balance';
import { polledMockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { seed, storeWith } from '../.storybook/storeWith';
import Pools from '@screens/Pools';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Pools
> {
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
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  const props = makeDrawerProps();
  test('Pools - snapshot', () => {
    const pools = render(
      <Provider store={storeWith(seed(balanceAtom, polledMockTotalBalance))}>
        <ContextAppLoadedProvider value={state}>
          <Pools {...props} />
        </ContextAppLoadedProvider>
      </Provider>,
    );
    expect(pools.toJSON()).toMatchSnapshot();
  });
});
