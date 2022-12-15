/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import Settings from '../components/Settings';
import { ContextLoadedProvider } from '../app/context';

import {
  ErrorModalData,
  ReceivePageState,
  SendPageState,
  SendProgress,
  SyncStatusReport,
  ToAddr,
  TotalBalance,
  WalletSettings,
} from '../app/AppState';

jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.useFakeTimers();

// test suite
describe('Component Settings - test', () => {
  //snapshot test
  const state = {
    navigation: null,
    route: null,
    dimensions: {} as {
      width: number;
      height: number;
      orientation: 'portrait' | 'landscape';
      deviceType: 'tablet' | 'phone';
      scale: number;
    },

    syncStatusReport: new SyncStatusReport(),
    addressPrivateKeys: new Map(),
    addresses: [],
    addressBook: [],
    transactions: null,
    sendPageState: new SendPageState(new ToAddr(0)),
    receivePageState: new ReceivePageState(),
    info: null,
    rescanning: false,
    syncingStatus: null,
    errorModalData: new ErrorModalData(),
    txBuildProgress: new SendProgress(),
    walletSeed: null,
    isMenuDrawerOpen: false,
    selectedMenuDrawerItem: '',
    aboutModalVisible: false,
    computingModalVisible: false,
    settingsModalVisible: false,
    infoModalVisible: false,
    rescanModalVisible: false,
    seedViewModalVisible: false,
    seedChangeModalVisible: false,
    seedBackupModalVisible: false,
    seedServerModalVisible: false,
    syncReportModalVisible: false,
    poolsModalVisible: false,
    newServer: null,
    uaAddress: null,
    translate: (p: string) => {
      if (p === 'settings.memos') {
        return [
          {
            value: '',
            text: '',
          },
        ];
      } else {
        return 'text translated';
      }
    },
    totalBalance: new TotalBalance(),
    wallet_settings: new WalletSettings(),
  };
  test('Settings - snapshot', () => {
    const settings = create(
      <ContextLoadedProvider value={state}>
        <Settings closeModal={() => {}} set_wallet_option={() => {}} set_server_option={() => {}} />
      </ContextLoadedProvider>,
    );
    expect(settings.toJSON()).toMatchSnapshot();
  });
});
