/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import Memo from '../components/Memo';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

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
describe('Component Memo - test', () => {
  //snapshot test
  test('Memo - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.translate = mockTranslate;
    const onSetMemo = jest.fn();
    const memo = render(
      <ContextAppLoadedProvider value={state}>
        <Memo message={''} includeUAMessage={true} setMessage={onSetMemo} />
      </ContextAppLoadedProvider>,
    );
    expect(memo.toJSON()).toMatchSnapshot();
  });
});
