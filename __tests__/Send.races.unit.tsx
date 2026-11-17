jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import Send from '@screens/Send';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { Route, SendPageStateClass, ToAddrClass } from '@app/AppState';
import Utils from '@app/utils';
import RPCModule from '@app/RPCModule';
import { mockAddresses } from '../__mocks__/dataMocks/mockAddresses';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockOnline } from '../__mocks__/dataMocks/mockOnline';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const spendableMock = RPCModule.getSpendableBalanceWithAddressInfo as jest.Mock;
const ZATOSHIS = 10 ** 8;

const layoutSend = () => {
  const container = screen.queryByTestId('send.container');
  if (container) {
    fireEvent(container, 'layout', {
      nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 800 } },
    });
  }
};

const stateFor = (address: string) => {
  const sendPageState = new SendPageStateClass(new ToAddrClass(0));
  sendPageState.toaddr.to = address;
  return sendPageState;
};

const sendUi = (address: string) => (
  <ContextAppLoadedProvider
    value={{
      ...defaultAppContextLoaded,
      ...mockOnline,
      addresses: mockAddresses,
      translate: mockTranslate,
      info: mockInfo,
      totalBalance: mockTotalBalance,
      sendPageState: stateFor(address),
    }}
  >
    <Send
      navigation={mockNavigation}
      route={{ key: 'Key-1', name: Route.Send, params: undefined }}
    />
  </ContextAppLoadedProvider>
);

const deferred = () => {
  let resolve: (value: string) => void = () => {};
  const promise = new Promise<string>(r => {
    resolve = r;
  });
  return { promise, resolve };
};

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('Tests that the maximum is the current address one when an earlier address answers last', async () => {
  jest
    .spyOn(Utils, 'isValidAddress')
    .mockResolvedValue({ isValid: true, shieldedOnlyUA: '' });
  const first = deferred();
  spendableMock.mockImplementation((address: string) =>
    address === 'UA-first-address-0000000000'
      ? first.promise
      : Promise.resolve(JSON.stringify({ spendable_balance: 0.2 * ZATOSHIS })),
  );

  const view = render(sendUi('UA-first-address-0000000000'));
  layoutSend();
  await act(async () => {});
  view.rerender(sendUi('UA-second-address-000000000'));
  await act(async () => {});
  await act(async () => {
    first.resolve(JSON.stringify({ spendable_balance: 0.9 * ZATOSHIS }));
  });

  await act(async () => {
    fireEvent.press(screen.getByTestId('send.max'));
  });
  expect(screen.getByTestId('send.amount').props.value).toBe('0.2');
});

test('Tests that the address check is the current address one when an earlier address answers last', async () => {
  let releaseFirst: (valid: boolean) => void = () => {};
  jest.spyOn(Utils, 'isValidAddress').mockImplementation(address =>
    address === 'UA-first-address-0000000000'
      ? new Promise(resolve => {
          releaseFirst = valid =>
            resolve({ isValid: valid, shieldedOnlyUA: '' });
        })
      : Promise.resolve({ isValid: false, shieldedOnlyUA: '' }),
  );
  spendableMock.mockResolvedValue(
    JSON.stringify({ spendable_balance: 0.2 * ZATOSHIS }),
  );

  const view = render(sendUi('UA-first-address-0000000000'));
  layoutSend();
  await act(async () => {});
  view.rerender(sendUi('bad-second-address'));
  await act(async () => {});
  await act(async () => {
    releaseFirst(true);
  });

  expect(spendableMock).not.toHaveBeenCalledWith('bad-second-address');
});
