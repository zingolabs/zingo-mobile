/**
 * The mask of the address in a row of the Insight screen.
 */
const mockTotalValueToAddress = jest.fn();

jest.mock(
  '@app/walletBackend',
  () =>
    new Proxy(jest.requireActual('@app/walletBackend'), {
      get: (backend, name) =>
        name === 'getTotalValueToAddress'
          ? mockTotalValueToAddress
          : backend[name],
    }),
);

import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Insight from '@screens/Insight';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { AppDrawerParamList } from '@app/types';
import { RouteEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const ADDRESS = 'u1abc123def456abc123def456abc123def456abc123';
const ZATOSHIS = 100000000;

const props: NativeStackScreenProps<AppDrawerParamList, RouteEnum.Insight> = {
  navigation: mockNavigation,
  route: { key: 'Key-1', name: RouteEnum.Insight, params: undefined },
};

test('Tests that the address of a row shows its mask when privacy is on.', async () => {
  mockTotalValueToAddress.mockResolvedValue({
    ok: true,
    value: JSON.stringify({ [ADDRESS]: ZATOSHIS }),
  });

  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: mockTranslate,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        privacy: true,
      }}
    >
      <Insight {...props} />
    </ContextAppLoadedProvider>,
  );

  expect(await screen.findByText('u1.....')).toBeTruthy();
  expect(screen.queryByText(/^u1abc/)).toBeNull();
});
