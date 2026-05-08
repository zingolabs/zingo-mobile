/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Settings from '../components/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '../app/context';
import {
  LanguageEnum,
  CurrencyEnum,
  RouteEnum,
  BlockExplorerEnum,
} from '../app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(): DrawerScreenProps<
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
  state.currency = CurrencyEnum.USDCurrency;
  state.language = LanguageEnum.en;
  state.sendAll = false;
  state.blockExplorer = BlockExplorerEnum.Zcashexplorer;
  state.rescanMenu = false;
  state.recoveryWalletInfoOnDevice = true;
  state.donation = false;
  const onSetOption = jest.fn();
  const toggle = jest.fn();
  const props = makeDrawerProps();
  test('Settings - snapshot', () => {
    const settings = render(
      <ContextAppLoadedProvider value={state}>
        <Settings
          {...props}
          setServerOption={onSetOption}
          setCurrencyOption={onSetOption}
          setLanguageOption={onSetOption}
          setSendAllOption={onSetOption}
          setDonationOption={onSetOption}
          setSecurityOption={onSetOption}
          setSelectServerOption={onSetOption}
          setRescanMenuOption={onSetOption}
          setRecoveryWalletInfoOnDeviceOption={onSetOption}
          setPerformanceLevelOption={onSetOption}
          setBlockExplorerOption={onSetOption}
          setNymOption={onSetOption}
          toggleMenuDrawer={toggle}
        />
      </ContextAppLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
