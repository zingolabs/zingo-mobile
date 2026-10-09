import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Send from '@screens/Send';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum, SendPageStateClass, ToAddrClass } from '@app/AppState';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

test('Tests that the spendable amount fills the amount field with the maximum when it is pressed', async () => {
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        addresses: mockAddresses,
        translate: mockTranslate,
        info: mockInfo,
        totalBalance: { ...mockTotalBalance, totalSpendableBalance: 0.5 },
        sendPageState: new SendPageStateClass(new ToAddrClass(0)),
      }}
    >
      <Send
        navigation={mockNavigation}
        route={{ key: 'Key-1', name: RouteEnum.Send, params: undefined }}
      />
    </ContextAppLoadedProvider>,
  );
  await act(async () => {});
  expect(screen.getByTestId('send.amount').props.value).toBe('');
  await act(async () => {
    fireEvent.press(screen.getByTestId('send.max'));
  });
  expect(screen.getByTestId('send.amount').props.value).toBe('0.50000000');
});
