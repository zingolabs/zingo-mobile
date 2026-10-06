import 'react-native';
import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ChainNameEnum, ScreenEnum, remoteServer } from '@app/AppState';
import RPCModule from '@app/RPCModule';
import VerifyAddress from '@screens/Receive/components/VerifyAddress';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

const owned =
  'zs17xwek7t788enw3zc88d5e54s4tz006uv5yclzet8c3z6j423ymfu98c5u0thd6zp4e6p2jumnna';
const other =
  'zs14mccpahrfc65hzy0sxntz04rxmwm0fnmkzdqu68f608m8ysssv028g5khgy6jgsxplfckyxhys5';

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(RPCModule.parseAddressInfo).mockResolvedValue(
    JSON.stringify({
      status: 'success',
      chain_name: 'main',
      address_kind: 'sapling',
    }),
  );
  jest.mocked(RPCModule.checkMyAddressInfo).mockImplementation(async address =>
    JSON.stringify({
      is_wallet_address: address === owned,
      account_id: 0,
      address_type: 'sapling',
      encoded_address: address,
    }),
  );
});

async function verified() {
  const context = {
    ...defaultAppContextLoaded,
    translate: (key: string) => key,
    addLastSnackbar: jest.fn(),
    server: remoteServer(
      'https://fixture.invalid',
      ChainNameEnum.mainChainName,
    ),
  };
  const view = render(
    <ContextAppLoadedProvider value={context}>
      <VerifyAddress
        closeSheet={jest.fn()}
        screenName={ScreenEnum.Receive}
        navigation={mockNavigation}
      />
    </ContextAppLoadedProvider>,
  );
  await act(async () => {
    fireEvent.changeText(view.getByTestId('send.addressplaceholder'), owned);
  });
  await waitFor(() => expect(view.getByText('verify')).toBeEnabled());
  await act(async () => {
    fireEvent.press(view.getByText('verify'));
  });
  expect(view.getByText('receive.verification-success')).toBeTruthy();
  return view;
}

test('Tests that the verification result is shown when the address is verified.', async () => {
  await verified();
  expect(RPCModule.checkMyAddressInfo).toHaveBeenCalledWith(owned);
});

test('Tests that the verification result is cleared when the address changes.', async () => {
  const view = await verified();
  await act(async () => {
    fireEvent.changeText(view.getByTestId('send.addressplaceholder'), other);
  });
  expect(view.queryByText('receive.verification-success')).toBeNull();
});

test('Tests that the verification result is cleared when the sheet is cancelled.', async () => {
  const view = await verified();
  await act(async () => {
    fireEvent.press(view.getByText('cancel'));
  });
  expect(view.queryByText('receive.verification-success')).toBeNull();
});
