/**
 * @format
 */

import 'react-native';
import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import { render } from '@testing-library/react-native';
import Receive from '../components/Receive';
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
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive Landscape - snapshot', () => {
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
        width: 600,
        height: 300,
        orientation: 'landscape',
        deviceType: 'phone',
        scale: 2.5,
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
    state.totalBalance.total = 1.12345678;
    const onFunction = jest.fn();
    const receive = render(
      <ContextLoadedProvider value={state}>
        <Receive
          fetchTotalBalance={onFunction}
          setUaAddress={onFunction}
          toggleMenuDrawer={onFunction}
          startRescan={onFunction}
          syncingStatusMoreInfoOnClick={onFunction}
          poolsMoreInfoOnClick={onFunction}
        />
      </ContextLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
