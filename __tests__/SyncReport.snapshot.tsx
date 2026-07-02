/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SyncReport from '../components/SyncReport';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSyncingStatus from '../__mocks__/dataMocks/mockSyncingStatus';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.SyncReport
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'About-1',
      name: RouteEnum.SyncReport,
      params: undefined,
    },
  };
}
// test suite
describe('Component SyncReport - test', () => {
  //snapshot test
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.birthday = mockWallet.birthday || 0;
  state.syncingStatus = mockSyncingStatus;
  state.netInfo = mockNetInfo;
  const props = makeDrawerProps();
  test('SyncReport - snapshot', () => {
    const sync = render(
      <ContextAppLoadedProvider value={state}>
        <SyncReport {...props} />
      </ContextAppLoadedProvider>,
    );
    expect(sync.toJSON()).toMatchSnapshot();
  });
});
