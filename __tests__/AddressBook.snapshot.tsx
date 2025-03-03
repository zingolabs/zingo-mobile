/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render } from '@testing-library/react-native';
import { ContextAppLoadedProvider, defaultAppContextLoaded } from '../app/context';
import { AddressBook } from '../components/AddressBook';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
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
describe('Component Address Book - test', () => {
  //snapshot test
  test('Address Book - snapshot', () => {
    const state = defaultAppContextLoaded;
    state.addressBook = mockAddressBook;
    state.translate = mockTranslate;
    const onSet = jest.fn();
    const ab: any = render(
      <ContextAppLoadedProvider value={state}>
        <AddressBook setAddressBook={onSet} />
      </ContextAppLoadedProvider>,
    );
    expect(ab.toJSON()).toMatchSnapshot();
  });
});
