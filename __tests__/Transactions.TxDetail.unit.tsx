/**
 * @format
 */

import 'react-native';
import React from 'react';
import { StackScreenProps } from '@react-navigation/stack';

import { render } from '@testing-library/react-native';
import TxDetail from '../components/Transactions/components/TxDetail';
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
  TxDetailType,
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
jest.mock('moment', () => () => ({
  format: (p: string) => {
    if (p === 'MMM YYYY') {
      return 'Dec 2022';
    } else if (p === 'YYYY MMM D h:mm a') {
      return '2022 Dec 13 8:00 am';
    } else if (p === 'MMM D, h:mm a') {
      return 'Dec 13, 8:00 am';
    }
  },
}));

// test suite
describe('Component Transactions TxDetail - test', () => {
  //unit test
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
    rescanning: false,
    wallet_settings: new WalletSettings(),
    syncingStatus: {} as SyncStatus,
    errorModalData: new ErrorModalData(),
    sendProgress: new SendProgress(),
    walletSeed: {} as WalletSeed,
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
    newServer: '' as string,
    uaAddress: '' as string,
    info: {} as InfoType,
    translate: () => 'translated text',
    totalBalance: new TotalBalance(),
  };
  const onClose = jest.fn();
  test('Transactions TxDetail - normal sent transaction', () => {
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const tx = {
      type: 'sent',
      address: 'UA-12345678901234567890',
      amount: -0.000065,
      position: '',
      confirmations: 20,
      txid: 'txid-1234567890',
      time: Date.now(),
      zec_price: 33.33,
      detailedTxns: [
        {
          address: 'other-UA-12345678901234567890',
          amount: 0.000055,
          memo: 'memo-abcdefgh',
        },
      ] as TxDetailType[],
    } as Transaction;
    const text: any = render(
      <ContextLoadedProvider value={state}>
        <TxDetail tx={tx} closeModal={onClose} />
      </ContextLoadedProvider>,
    ).toJSON();
    expect(text.type).toBe('RCTSafeAreaView');
    expect(text.children[0].children[0].children[2].children[3].children[1].children[0].children[1].children[0]).toBe(
      ' 0.0000',
    );
    expect(text.children[0].children[0].children[2].children[3].children[1].children[0].children[2].children[0]).toBe(
      '1000',
    );
  });

  test('Transactions TxDetail - self sent transaction', () => {
    state.info.currencyName = 'ZEC';
    state.totalBalance.total = 1.12345678;
    const txSelfSend = {
      type: 'sent',
      address: 'UA-12345678901234567890',
      amount: -0.00001,
      position: '',
      confirmations: 20,
      txid: 'txid-1234567890',
      time: Date.now(),
      zec_price: 33.33,
      detailedTxns: [
        {
          address: 'other-UA-12345678901234567890',
          amount: 0.00055,
          memo: 'memo-abcdefgh',
        },
      ] as TxDetailType[],
    } as Transaction;
    const textSelfSend: any = render(
      <ContextLoadedProvider value={state}>
        <TxDetail tx={txSelfSend} closeModal={onClose} />
      </ContextLoadedProvider>,
    ).toJSON();
    expect(textSelfSend.type).toBe('RCTSafeAreaView');
    expect(
      textSelfSend.children[0].children[0].children[2].children[3].children[1].children[0].children[1].children[0],
    ).toBe(' 0.0000');
    expect(
      textSelfSend.children[0].children[0].children[2].children[3].children[1].children[0].children[2].children[0],
    ).toBe('1000');
  });
});
