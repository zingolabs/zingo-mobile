/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Rescan from '@screens/Rescan';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Rescan
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Rescan,
      params: undefined,
    },
  };
}
// test suite
describe('Component Rescan - test', () => {
  //snapshot test
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.birthday = mockWallet.birthday || 0;
  const onRescan = jest.fn();
  const props = makeDrawerProps();
  test('Rescan - snapshot', () => {
    const rescan = render(
      <ContextAppLoadedProvider value={state}>
        <Rescan {...props} doRescan={onRescan} />
      </ContextAppLoadedProvider>,
    );
    expect(rescan.toJSON()).toMatchSnapshot();
  });
});
