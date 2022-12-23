/**
 * @format
 */

import 'react-native';
import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import { render } from '@testing-library/react-native';
import ImportKeyModal from '../components/ImportKey';
import { ContextLoadedProvider } from '../app/context';

import {
  Address,
  AddressBookEntry,
  ErrorModalData,
  InfoType,
  ReceivePageState,
  SendPageState,
  SendProgress,
  SyncStatus,
  SyncStatusReport,
  ToAddr,
  TotalBalance,
  Transaction,
  WalletSeed,
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
      navigation: {} as StackScreenProps<any>['navigation'],
      route: {} as StackScreenProps<any>['route'],
      dimensions: {} as {
        width: number;
        height: number;
        orientation: 'portrait' | 'landscape';
        deviceType: 'tablet' | 'phone';
        scale: number;
      },

      syncStatusReport: new SyncStatusReport(),
      addressPrivateKeys: new Map(),
      addresses: [] as Address[],
      addressBook: [] as AddressBookEntry[],
      transactions: [] as Transaction[],
      sendPageState: new SendPageState(new ToAddr(0)),
      receivePageState: new ReceivePageState(),
      info: {} as InfoType,
      rescanning: false,
      wallet_settings: new WalletSettings(),
      syncingStatus: {} as SyncStatus,
      errorModalData: new ErrorModalData(),
      sendProgress: new SendProgress(),
      walletSeed: {} as WalletSeed,
      isMenuDrawerOpen: false,
      selectedMenuDrawerItem: '' as string,
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
      newServer: '' as string,
      uaAddress: '' as string,
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
