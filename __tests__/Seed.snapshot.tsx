/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Seed from '../components/Seed';
import { ContextLoadedProvider, ContextLoadingProvider } from '../app/context';

import {
  ErrorModalData,
  InfoType,
  ReceivePageState,
  SendPageState,
  SendProgress,
  SyncStatusReport,
  ToAddr,
  TotalBalance,
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
jest.mock('react-native-reanimated', () => {
  return class Reanimated {
    public static Value() {
      return jest.fn(() => {});
    }
    public static View() {
      return '';
    }
  };
});

// test suite
describe('Component Seed - test', () => {
  //snapshot test
  const stateLoaded = {
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
      seed: 'pepe lolo titi',
      birthday: 1500100,
    } as WalletSeed,
  };
  stateLoaded.info.currencyName = 'ZEC';
  stateLoaded.totalBalance.total = 1.12345678;
  const onOk = jest.fn();
  const onCancel = jest.fn();
  test('Seed View - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'view'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Change - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'change'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Server - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'server'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Backup - snapshot', () => {
    const seed = render(
      <ContextLoadedProvider value={stateLoaded}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'backup'} />
      </ContextLoadedProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  const stateLoading = {
    navigation: null,
    route: null,
    dimensions: {} as {
      width: number;
      height: number;
      orientation: 'portrait' | 'landscape';
      deviceType: 'tablet' | 'phone';
      scale: number;
    },

    screen: 0,
    actionButtonsDisabled: false,
    walletExists: false,
    server: null,
    info: null,

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
      seed: 'pepe lolo titi',
      birthday: 1500100,
    } as WalletSeed,
  };
  stateLoading.totalBalance.total = 1.12345678;
  test('Seed New - snapshot', () => {
    const seed = render(
      <ContextLoadingProvider value={stateLoading}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'new'} />
      </ContextLoadingProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
  test('Seed Restore - snapshot', () => {
    const seed = render(
      <ContextLoadingProvider value={stateLoading}>
        <Seed onClickOK={onOk} onClickCancel={onCancel} action={'restore'} />
      </ContextLoadingProvider>,
    );
    expect(seed.toJSON()).toMatchSnapshot();
  });
});
