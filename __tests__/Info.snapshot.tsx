/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Info from '../components/Info';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';

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
describe('Component Info - test', () => {
  //snapshot test
  test('Info - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.info = mockInfo;
    state.zecPrice = mockZecPrice;
    state.translate = mockTranslate;
    state.totalBalance = mockTotalBalance;
    const info: any = render(
      <ContextAppLoadedProvider value={state}>
        <Info />
      </ContextAppLoadedProvider>,
    );
    expect(info.toJSON()).toMatchSnapshot();
  });
});
