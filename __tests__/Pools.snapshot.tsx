/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Pools from '../components/Pools';
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
      decimalSeparator: '.', // us
      groupingSeparator: ',', // us
    };
  },
}));
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// test suite
describe('Component Info - test', () => {
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
    info: {} as InfoType,
    translate: () => 'translated text',
    totalBalance: new TotalBalance(),
  };
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  state.totalBalance.orchardBal = 0.6;
  state.totalBalance.spendableOrchard = 0.3;
  state.totalBalance.privateBal = 0.4;
  state.totalBalance.spendablePrivate = 0.2;
  state.totalBalance.transparentBal = 0.12345678;
  const onClose = jest.fn();
  test('Matches the snapshot Info', () => {
    const info: any = render(
      <ContextLoadedProvider value={state}>
        <Pools closeModal={onClose} />
      </ContextLoadedProvider>,
    );
    expect(info.toJSON()).toMatchSnapshot();
  });
});
