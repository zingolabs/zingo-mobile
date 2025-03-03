/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import ValueTransferDetail from '../components/History/components/ValueTransferDetail';
import { defaultAppContextLoaded, ContextAppLoadedProvider } from '../app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';

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
describe('Component History ValueTransferDetail - test', () => {
  //unit test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.valueTransfers = mockValueTransfers;
  const onSetOption = jest.fn();

  test('History ValueTransferDetail - sent ValueTransfer with 2 addresses', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={0}
          vt={mockValueTransfers[0]}
          valueTransfersSliced={mockValueTransfers}
          totalLength={mockValueTransfers.length}
          setPrivacyOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    ).toJSON();
    const num = screen.getAllByText('0.1234');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
    screen.getByText('hola & hello');
    const txt = screen.queryByText('hola & hello\nhello & hola');
    expect(txt).toBe(null);
  });

  test('History ValueTransferDetail - memo self sent ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={1}
          vt={mockValueTransfers[1]}
          valueTransfersSliced={mockValueTransfers}
          totalLength={mockValueTransfers.length}
          setPrivacyOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0000');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
    screen.getByText('orchard memo\nsapling memo');
  });

  test('History ValueTransferDetail - self sent ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={2}
          vt={mockValueTransfers[2]}
          valueTransfersSliced={mockValueTransfers}
          totalLength={mockValueTransfers.length}
          setPrivacyOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0000');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
  });

  test('History ValueTransferDetail - received ValueTransfer with 2 pools', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={3}
          vt={mockValueTransfers[3]}
          valueTransfersSliced={mockValueTransfers}
          totalLength={mockValueTransfers.length}
          setPrivacyOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.7765');
    expect(num.length).toBe(2);
    screen.getByText('hola & hello');
    const txt = screen.queryByText('hola & hello\nhello & hola');
    expect(txt).toBe(null);
  });

  test('History ValueTransferDetail - shield ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={4}
          vt={mockValueTransfers[4]}
          valueTransfersSliced={mockValueTransfers}
          totalLength={mockValueTransfers.length}
          setPrivacyOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0009');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
  });

  test('History ValueTransferDetail - Rejection ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail
          index={5}
          vt={mockValueTransfers[5]}
          valueTransfersSliced={mockValueTransfers}
          totalLength={mockValueTransfers.length}
          setPrivacyOption={onSetOption}
        />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0009');
    expect(num.length).toBe(2);
    screen.getByText('0.0001');
  });
});
