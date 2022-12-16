/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Transactions from '../components/Transactions';
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

jest.useFakeTimers();
jest.mock('@fortawesome/react-native-fontawesome', () => ({
  FontAwesomeIcon: '',
}));
jest.mock('react-native-localize', () => ({
  getNumberFormatSettings: () => {
    return {
      decimalSeparator: '.', // us
      groupingSeparator: ',', // us
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');


// test suite
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive - snapshot', () => {
    const state = {
      navigation: null,
      route: null,

      syncStatusReport: new SyncStatusReport(),
      addressPrivateKeys: new Map(),
      addressBook: [],
      transactions: null,
      sendPageState: new SendPageState(new ToAddr(0)),
      receivePageState: new ReceivePageState(),
      info: null,
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
      uaAddress: 'UA',
      addresses: [
        {
          uaAddress: 'UA',
          address: 'UA',
          addressKind: 'u',
          containsPending: false,
          receivers: 'ozt',
        },
      ],
      translate: () => 'text translated',
      dimensions: {
        width: 200,
        height: 200,
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
    const receive = render(
      <ContextLoadedProvider value={state}>
        <Transactions
          doRefresh={() => {}}
          toggleMenuDrawer={() => {}}
          setComputingModalVisible={() => {}}
          poolsMoreInfoOnClick={() => {}}
          syncingStatusMoreInfoOnClick={() => {}}
        />
      </ContextLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
