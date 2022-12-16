/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import ImportKeyModal from '../components/ImportKey';
import { ContextLoadedProvider } from '../app/context';

import {
  ErrorModalData,
  InfoType,
  ReceivePageState,
  SendPageState,
  SendProgress,
  SyncStatusReport,
  ToAddr,
  TotalBalance,
  WalletSettings,
} from '../app/AppState';

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.',
      groupingSeparator: ',',
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component ImportKey - test', () => {
  //snapshot test
  test('Matches the snapshot ImportKey', () => {
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
      info: {} as InfoType,
      rescanning: false,
      wallet_settings: new WalletSettings(),
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
      translate: () => 'text translated',
      totalBalance: new TotalBalance(),
    };
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const onClose = jest.fn();
    const onImport = jest.fn();
    const importKey = render(
      <ContextLoadedProvider value={state}>
        <ImportKeyModal closeModal={onClose} doImport={onImport} />
      </ContextLoadedProvider>,
    );
    expect(importKey.toJSON()).toMatchSnapshot();
  });
});
