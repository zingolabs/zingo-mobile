/**
 * @format
 */

import 'react-native';
import React from 'react';

import { act, fireEvent, render } from '@testing-library/react-native';
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

describe('History when the wallet has no activity', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  test('Tests that the sprout and Receive ZEC show when the wallet has no transfers', async () => {
    const state = {
      ...defaultAppContextLoaded,
      valueTransfers: [],
      addresses: mockAddresses,
      translate: mockTranslate,
      info: mockInfo,
      totalBalance: mockTotalBalance,
    };
    const screen = render(
      <ContextAppLoadedProvider value={state}>
        <History {...props} />
      </ContextAppLoadedProvider>,
    );
    await act(async () => {});
    expect(screen.getByTestId('history.empty')).toBeTruthy();

    fireEvent.press(screen.getByTestId('history.empty.receive'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith(Route.Receive);
  });
});
