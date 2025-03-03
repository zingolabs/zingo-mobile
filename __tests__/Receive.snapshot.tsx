/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Receive from '../components/Receive';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';

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
describe('Component Receive - test', () => {
  //snapshot test
  test('Receive - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.uOrchardAddress = mockAddresses[0].uOrchardAddress;
    state.addresses = mockAddresses;
    state.translate = mockTranslate;
    state.info = mockInfo;
    state.totalBalance = mockTotalBalance;
    const onFunction = jest.fn();
    const receive = render(
      <ContextAppLoadedProvider value={state}>
        <Receive toggleMenuDrawer={onFunction} alone={false} />
      </ContextAppLoadedProvider>,
    );
    expect(receive.toJSON()).toMatchSnapshot();
  });
});
