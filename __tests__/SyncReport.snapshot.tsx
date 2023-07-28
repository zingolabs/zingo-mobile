/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SyncReport from '../components/SyncReport';
import { defaultAppStateLoaded, ContextAppLoadedProvider } from '../app/context';

const NetInfoStateType = {
  unknown: 'unknown',
  none: 'none',
  cellular: 'cellular',
  wifi: 'wifi',
  bluetooth: 'bluetooth',
  ethernet: 'ethernet',
  wimax: 'wimax',
  vpn: 'vpn',
  other: 'other',
};

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
jest.mock('@react-native-community/netinfo', () => ({
  RNCNetInfo: () => {
    const RN = jest.requireActual('react-native');

    RN.NativeModules.RNCNetInfo = {
      execute: jest.fn(() => '{}'),
    };

    return RN;
  },
  NetInfoStateType: NetInfoStateType,
}));
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
  };

  return RN;
});

// test suite
describe('Component SyncReport - test', () => {
  //snapshot test
  const state = defaultAppStateLoaded;
  state.translate = () => 'translated text';
  state.info.currencyName = 'ZEC';
  state.totalBalance.total = 1.12345678;
  state.wallet.birthday = 1500100;
  state.syncingStatus.syncID = 1;
  state.syncingStatus.inProgress = true;
  state.syncingStatus.currentBatch = 5;
  state.syncingStatus.totalBatches = 50;
  state.syncingStatus.currentBlock = 1800100;
  state.syncingStatus.lastBlockWallet = 1800000;
  state.syncingStatus.lastBlockServer = 1900100;
  state.syncingStatus.secondsPerBatch = 122;
  state.syncingStatus.process_end_block = 1600100;
  state.netInfo.isConnected = true;
  const onClose = jest.fn();
  test('SyncReport - snapshot', () => {
    const sync = render(
      <ContextAppLoadedProvider value={state}>
        <SyncReport closeModal={onClose} />
      </ContextAppLoadedProvider>,
    );
    expect(sync.toJSON()).toMatchSnapshot();
  });
});
