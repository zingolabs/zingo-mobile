/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import PrivKey from '../components/PrivKey';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
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
describe('Component PrivKey - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  test('PrivKey Private - snapshot', () => {
    const privKey = render(
      <ContextAppLoadedProvider value={state}>
        <PrivKey
          address={'UA-12345678901234567890'}
          keyType={0}
          privKey={'priv-key-12345678901234567890'}
        />
      </ContextAppLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
  test('PrivKey View - snapshot', () => {
    const privKey = render(
      <ContextAppLoadedProvider value={state}>
        <PrivKey
          address={'UA-12345678901234567890'}
          keyType={1}
          privKey={'view-key-12345678901234567890'}
        />
      </ContextAppLoadedProvider>,
    );
    expect(privKey.toJSON()).toMatchSnapshot();
  });
});
