/**
 * @format
 */

import 'react-native';
import React from 'react';

import { render, screen } from '@testing-library/react-native';
import ValueTransferDetail from '@screens/ValueTransferDetail';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import { Route } from '@app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(
  i: number,
): NativeStackScreenProps<AppDrawerParamList, 'ValueTransferDetail'> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: Route.ValueTransferDetail,
      params: {
        index: i,
        vt: mockValueTransfers[i],
        valueTransfersSliced: mockValueTransfers,
        totalLength: mockValueTransfers.length,
      },
    },
  };
}

describe('Component History ValueTransferDetail - test', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.valueTransfers = mockValueTransfers;

  const amountOf = () => screen.getByTestId('valuetransferdetail.amount');
  const open = (i: number) =>
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...makeDrawerProps(i)} />
      </ContextAppLoadedProvider>,
    );

  test('Tests that a sent transfer shows its amount, fee and memo once when it went to two addresses', () => {
    open(0);
    expect(amountOf()).toHaveTextContent(/0\.1234/);
    screen.getByText(/0\.0001/);
    screen.getByText('hola & hello');
    expect(screen.queryByText('hola & hello\nhello & hola')).toBe(null);
  });

  test('Tests that a memo sent to oneself shows both memos when it carried two', () => {
    open(1);
    expect(amountOf()).toHaveTextContent(/0/);
    screen.getByText(/0\.0001/);
    screen.getByText('orchard memo\nsapling memo');
  });

  test('Tests that a send to oneself shows its fee when it paid one', () => {
    open(2);
    screen.getByText(/0\.0001/);
  });

  test('Tests that a received transfer shows its amount and memo once when it came in two pools', () => {
    open(3);
    expect(amountOf()).toHaveTextContent(/0\.7765/);
    screen.getByText('hola & hello');
    expect(screen.queryByText('hola & hello\nhello & hola')).toBe(null);
  });

  test('Tests that a shielding shows its amount and fee when it is open', () => {
    open(4);
    expect(amountOf()).toHaveTextContent(/0\.0009/);
    screen.getByText(/0\.0001/);
  });

  test('Tests that a rejection shows its amount and fee when it is open', () => {
    open(5);
    expect(amountOf()).toHaveTextContent(/0\.0009/);
    screen.getByText(/0\.0001/);
  });
});
