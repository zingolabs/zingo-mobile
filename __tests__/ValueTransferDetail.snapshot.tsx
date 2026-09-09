/**
 * @format
 */

import 'react-native';
import React from 'react';
import { render } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import ValueTransferDetail from '@screens/ValueTransferDetail';
import { CurrencyEnum, ModeEnum, RouteEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockValueTransfers } from '../__mocks__/dataMocks/mockValueTransfers';
import { mockAddressBook } from '../__mocks__/dataMocks/mockAddressBook';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockZecPrice } from '../__mocks__/dataMocks/mockZecPrice';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockNetInfo } from '../__mocks__/dataMocks/mockNetInfo';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AppDrawerParamList } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// Fixed timestamps so the snapshot doesn't change between runs
const FIXED_TIME = 1704067200; // 2024-01-01 00:00:00 UTC (seconds)

const fixedValueTransfers = mockValueTransfers.map(vt => ({
  ...vt,
  time: FIXED_TIME,
}));

function makeProps(
  index: number,
): NativeStackScreenProps<AppDrawerParamList, RouteEnum.ValueTransferDetail> {
  return {
    navigation: mockNavigation,
    route: {
      key: 'Key-1',
      name: RouteEnum.ValueTransferDetail,
      params: {
        index,
        vt: fixedValueTransfers[index],
        valueTransfersSliced: fixedValueTransfers,
        totalLength: fixedValueTransfers.length,
      },
    },
  };
}

describe('ValueTransferDetail - snapshots', () => {
  const state = { ...defaultAppContextLoaded };
  state.translate = mockTranslate;
  state.info = mockInfo;
  state.addressBook = mockAddressBook;
  state.addresses = mockAddresses;
  state.totalBalance = mockTotalBalance;
  state.zecPrice = mockZecPrice;
  state.server = mockServer;
  state.netInfo = mockNetInfo;
  state.mode = ModeEnum.advanced;
  state.currency = CurrencyEnum.noCurrency;

  test('ValueTransferDetail sent transaction', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ValueTransferDetail {...makeProps(0)} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });

  test('ValueTransferDetail received transaction', () => {
    expect(
      render(
        <ContextAppLoadedProvider value={state}>
          <ValueTransferDetail {...makeProps(3)} />
        </ContextAppLoadedProvider>,
      ).toJSON(),
    ).toMatchSnapshot();
  });
});
