import 'react-native';
import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import RPCModule from '@app/RPCModule';
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { Route, SelectServerEnum } from '@app/AppState';
import { saveRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

// Every member of the mocked bridge is a lazily created jest.fn; the wallet
// the warning saves is read through getSeedInfo.
jest.mock('@app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

const nativeRpc = RPCModule as unknown as Record<string, jest.Mock>;

const keychain = Keychain as jest.Mocked<typeof Keychain>;
const wallet = { seed: 'abandon ability able', birthday: 1994579 };

beforeEach(() => {
  nativeRpc.walletsInfo.mockResolvedValue(
    JSON.stringify({
      active: 'w1',
      wallets: [
        {
          id: 'w1',
          hasFile: true,
          meta: { v: 1, id: 'w1', order: 1, createdAt: 0, name: 'Wallet 1' },
        },
      ],
    }),
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

test('Tests that the recovery info is saved when it is written and reads back', async () => {
  let written = { username: '', password: '', service: '' };
  keychain.setGenericPassword.mockImplementation(
    async (username, password, options) => {
      written = { username, password, service: String(options?.service) };
      return false;
    },
  );
  keychain.getGenericPassword.mockImplementation(async () => written as never);
  expect(await saveRecoveryWalletInfo(wallet)).toEqual({ kind: 'saved' });
});

test('Tests that the write error is reported when the store refuses the entry', async () => {
  keychain.setGenericPassword.mockRejectedValue(new Error('keystore locked'));
  keychain.getGenericPassword.mockResolvedValue(false);
  expect(await saveRecoveryWalletInfo(wallet)).toEqual({
    kind: 'write-failed',
    error: 'keystore locked',
  });
});

test('Tests that nothing is written when the wallet has no seed or viewing key', async () => {
  expect(await saveRecoveryWalletInfo(null)).toEqual({ kind: 'no-keys' });
  expect(keychain.setGenericPassword).not.toHaveBeenCalled();
});

test('Tests that tapping the warning in Settings saves the recovery info and shows the error under it when it fails', async () => {
  keychain.hasGenericPassword.mockResolvedValue(false);
  keychain.setGenericPassword.mockRejectedValue(new Error('keystore locked'));
  keychain.getGenericPassword.mockResolvedValue(false);
  nativeRpc.getSeedInfo.mockResolvedValueOnce(
    JSON.stringify({ seed_phrase: wallet.seed, birthday: wallet.birthday }),
  );
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: Route.Settings, params: undefined },
  };
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (key: string) => key,
        info: mockInfo,
        totalBalance: mockTotalBalance,
        server: mockServer,
        selectServer: SelectServerEnum.auto,
      }}
    >
      <Settings
        {...props}
        setCurrencyOption={jest.fn()}
        setSendAllOption={jest.fn()}
        setDonationOption={jest.fn()}
        setPrivacyOption={jest.fn()}
        setModeOption={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );
  const warning = await screen.findByTestId('settings.recoveryinfo.save');
  await act(async () => {
    fireEvent.press(warning);
  });
  await waitFor(() =>
    expect(
      screen.getByTestId('settings.recoveryinfo.result').props.children,
    ).toBe('settings.recoveryinfo-failed'),
  );
  expect(nativeRpc.getSeedInfo).toHaveBeenCalled();
});
