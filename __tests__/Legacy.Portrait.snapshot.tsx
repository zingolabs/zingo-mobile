/**
 * @format
 */

import 'react-native';
import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import { render } from '@testing-library/react-native';
import Legacy from '../components/Legacy';
import { ContextLoadedProvider } from '../app/context';

import {
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
jest.mock('react-native-tab-view', () => ({
  TabView: '',
  TabBar: '',
}));
jest.mock('react-native-option-menu', () => '');
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component Legacy - test', () => {
  //snapshot test
  test('Legacy Portrait - snapshot', () => {
    const state = {
      navigation: {} as StackScreenProps<any>['navigation'],
      route: {} as StackScreenProps<any>['route'],

      syncStatusReport: new SyncStatusReport(),
      addressPrivateKeys: new Map(),
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
      uaAddress: 'UA-12345678901234567890',
      addresses: [
        {
          uaAddress: 'UA-12345678901234567890',
          address: 'UA-12345678901234567890',
          addressKind: 'u',
          containsPending: false,
          receivers: 'ozt',
        },
        {
          uaAddress: 'UA-12345678901234567890',
          address: 'sapling-12345678901234567890',
          addressKind: 'z',
          containsPending: false,
          receivers: 'z',
        },
        {
          uaAddress: 'UA-12345678901234567890',
          address: 'transparent-12345678901234567890',
          addressKind: 't',
          containsPending: false,
          receivers: 't',
        },
      ],
      translate: () => 'text translated',
      dimensions: {
        width: 200,
        height: 400,
        orientation: 'portrait',
        deviceType: 'tablet',
        scale: 1.5,
      } as {
        width: number;
        height: number;
        orientation: 'portrait' | 'landscape';
        deviceType: 'tablet' | 'phone';
        scale: number;
      },
      totalBalance: new TotalBalance(),
    };
    state.info.currencyName = 'ZEC';
    state.info.zecPrice = 33.33;
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const legacy = render(
      <ContextLoadedProvider value={state}>
        <Legacy fetchTotalBalance={onFunction} toggleMenuDrawer={onFunction} startRescan={onFunction} />
      </ContextLoadedProvider>,
    );
    expect(legacy.toJSON()).toMatchSnapshot();
  });
});
