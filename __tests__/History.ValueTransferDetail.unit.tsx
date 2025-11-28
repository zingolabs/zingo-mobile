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
import { DrawerScreenProps } from '@react-navigation/drawer';
import { AppDrawerParamList } from '../app/types';
import { RouteEnum } from '../app/AppState';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

function makeDrawerProps(i: number): DrawerScreenProps<AppDrawerParamList, RouteEnum.ValueTransferDetail> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.ValueTransferDetail,
      params: {
        index: i,
        vt: mockValueTransfers[i],
        valueTransfersSliced: mockValueTransfers,
        totalLength: mockValueTransfers.length,
      },
    },
  };
}
// test suite
describe('Component History ValueTransferDetail - test', () => {
  //unit test
  const state = defaultAppContextLoaded;
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.totalBalance = mockTotalBalance;
  state.valueTransfers = mockValueTransfers;
  const props_0 = makeDrawerProps(0);
  test('History ValueTransferDetail - sent ValueTransfer with 2 addresses', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...props_0} />
      </ContextAppLoadedProvider>,
    ).toJSON();
    // rounded
    const num = screen.getAllByText('-0.12346');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_1 = makeDrawerProps(1);
  test('History ValueTransferDetail - memo self sent ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...props_1} />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_2 = makeDrawerProps(2);
  test('History ValueTransferDetail - self sent ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...props_2} />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_3 = makeDrawerProps(3);
  test('History ValueTransferDetail - received ValueTransfer with 2 pools', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...props_3} />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.77654');
    expect(num.length).toBe(1);
  });

  const props_4 = makeDrawerProps(4);
  test('History ValueTransferDetail - shield ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...props_4} />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('0.0009');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });

  const props_5 = makeDrawerProps(5);
  test('History ValueTransferDetail - Rejection ValueTransfer', () => {
    render(
      <ContextAppLoadedProvider value={state}>
        <ValueTransferDetail {...props_5} />
      </ContextAppLoadedProvider>,
    );
    const num = screen.getAllByText('-0.0009');
    expect(num.length).toBe(1);
    screen.getByText('0.0001');
  });
});
