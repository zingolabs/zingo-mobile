/**
 * @format
 */

import 'react-native';
import React from 'react';

import { act, render } from '@testing-library/react-native';
import { useNavigation } from '@react-navigation/native';
import History from '@screens/History';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { Route } from '@app/AppState';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { HomeTabScreenProps } from '@app/types';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const props: HomeTabScreenProps<'History'> = {
  navigation: mockNavigation,
  route: { key: 'Key-1', name: Route.History, params: undefined },
};

const state = (seedBackedUp: boolean) => ({
  ...defaultAppContextLoaded,
  valueTransfers: [],
  addresses: mockAddresses,
  translate: mockTranslate,
  info: mockInfo,
  totalBalance: mockTotalBalance,
  readOnly: false,
  seedBackedUp,
});

beforeEach(() => {
  (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
});

test('Tests that the seed notice leaves at once when the backup finishes. The backup flow ends on its own done screen.', async () => {
  const screen = render(
    <ContextAppLoadedProvider value={state(false)}>
      <History {...props} />
    </ContextAppLoadedProvider>,
  );
  await act(async () => {});
  expect(screen.getByTestId('seedbackup.notice')).toBeTruthy();

  screen.rerender(
    <ContextAppLoadedProvider value={state(true)}>
      <History {...props} />
    </ContextAppLoadedProvider>,
  );
  await act(async () => {});

  expect(screen.queryByTestId('seedbackup.notice')).toBeNull();
});
