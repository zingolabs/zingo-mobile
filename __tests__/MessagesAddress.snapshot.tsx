/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { MessagesAddress } from '../components/Messages';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { CurrencyEnum, ModeEnum } from '../app/AppState';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';

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
describe('Component Messages Address - test', () => {
  //snapshot test
  const state = defaultAppContextLoaded;
  state.valueTransfers = mockValueTransfers;
  state.uOrchardAddress = mockAddresses[0].uOrchardAddress;
  state.addresses = mockAddresses;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  const onFunction = jest.fn();

  test('Messages Address - snapshot', () => {
    // no currency
    state.currency = CurrencyEnum.noCurrency;
    // privacy normal
    state.privacy = false;
    // mode basic
    state.mode = ModeEnum.basic;
    const messages = render(
      <ContextAppLoadedProvider value={state}>
        <MessagesAddress
          setPrivacyOption={onFunction}
          setScrollToBottom={onFunction}
          scrollToBottom={false}
          address={mockAddresses[0].uOrchardAddress}
          sendTransaction={onFunction}
          setServerOption={onFunction}
        />
      </ContextAppLoadedProvider>,
    );
    expect(messages.toJSON()).toMatchSnapshot();
  });
});
