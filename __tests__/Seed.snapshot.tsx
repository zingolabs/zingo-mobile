/**
 * @format
 */

import 'react-native';
import React from 'react';

import { create } from 'react-test-renderer';
import Seed from '../components/Seed';
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
jest.useFakeTimers();

// test suite
describe('Component Seed - test', () => {
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
    wallet_settings: new WalletSettings(),
    syncingStatus: null,
    errorModalData: new ErrorModalData(),
    txBuildProgress: new SendProgress(),
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
      if (p === 'seed.buttontexts') {
        return {
          new: [''],
          change: [''],
          server: [''],
          view: [''],
          restore: [''],
          backup: [''],
        };
      } else {
        return 'text translated';
      }
    },
    totalBalance: new TotalBalance(),
    walletSeed: {
      seed: 'pepe lolo',
      birthday: 0,
    },
  };
  test('Seed - snapshot', () => {
    const seed = create(
      <ContextLoadedProvider value={state}>
        <Seed onClickOK={() => {}} onClickCancel={() => {}} action={'view'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
});
