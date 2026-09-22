/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import {
  LanguageEnum,
  RouteEnum,
  BlockExplorerEnum,
} from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): NativeStackScreenProps<
  AppDrawerParamList,
  RouteEnum.Settings
> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.Settings,
      params: undefined,
    },
  };
}
// test suite
describe('Component Settings - test', () => {
  //snapshot test
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.server = mockServer;
  state.language = LanguageEnum.en;
  state.blockExplorer = BlockExplorerEnum.Zcashexplorer;
  state.recoveryWalletInfoOnDevice = true;
  const onSetOption = jest.fn();
  const toggle = jest.fn();
  const props = makeDrawerProps();
  test('Settings - snapshot', () => {
    const settings = render(
      <ContextAppLoadedProvider value={state}>
        <Settings
          {...props}
          setServerOption={onSetOption}
          setLanguageOption={onSetOption}
          setSecurityOption={onSetOption}
          setSelectServerOption={onSetOption}
          setRecoveryWalletInfoOnDeviceOption={onSetOption}
          setPerformanceLevelOption={onSetOption}
          setBlockExplorerOption={onSetOption}
          toggleMenuDrawer={toggle}
        />
      </ContextAppLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
