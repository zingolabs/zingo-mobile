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

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  RN.NativeModules.RPCModule = {
    execute: jest.fn(() => '{}'),
    getLatestBlock: jest.fn(() => '{}'),
    walletExists: jest.fn(() => 'false'),
    getValueTransfersList: jest.fn(() => '{ "value_transfers": [], "total": 0 }'),
    setCryptoDefaultProvider: jest.fn(() => 'true'),
    createNewWallet: jest.fn(() => '{ "seed": "seed phrase test", "birthday": 0 }'),
    doSave: jest.fn(),
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
  test('SyncReport - snapshot', () => {
    const sync = render(
      <ContextAppLoadedProvider value={state}>
        <SyncReport />
      </ContextAppLoadedProvider>,
    );
    expect(sync.toJSON()).toMatchSnapshot();
  });
});
