/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import SyncReport from '../components/SyncReport';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockWallet } from '../__mocks__/dataMocks/mockWallet';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockSyncingStatus from '../__mocks__/dataMocks/mockSyncingStatus';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';

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
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.wallet = mockWallet;
  state.syncingStatus = mockSyncingStatus;
  state.netInfo = mockNetInfo;
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
