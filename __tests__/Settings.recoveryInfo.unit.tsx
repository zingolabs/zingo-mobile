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
import Settings from '@screens/Settings';
import {
  defaultAppContextLoaded,
  ContextAppLoadedProvider,
} from '@app/context';
import { RouteEnum, SelectServerEnum } from '@app/AppState';
import { saveRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';
import { mockInfo } from '../__mocks__/dataMocks/mockInfo';
import { mockTotalBalance } from '../__mocks__/dataMocks/mockTotalBalance';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const mockedFetchWallet = jest.fn();

jest.mock('@app/uris/fetchServerList', () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue([]),
}));
jest.mock('@app/walletBackend', () => ({
  ...jest.requireActual('@app/walletBackend'),
  fetchWallet: (...args: unknown[]) => mockedFetchWallet(...args),
}));

const keychain = Keychain as jest.Mocked<typeof Keychain>;
const wallet = { seed: 'abandon ability able', birthday: 1994579 };

afterEach(() => {
  jest.clearAllMocks();
});

test('Tests that the recovery info is saved when it is written and reads back', async () => {
  const { GlobalConst } = jest.requireActual('@app/AppState');
  keychain.getGenericPassword.mockImplementation(
    async () =>
      ({
        username: GlobalConst.keyKeyChain,
        password: JSON.stringify(wallet),
        service: GlobalConst.serviceKeyChain,
      }) as never,
  );
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
  mockedFetchWallet.mockResolvedValue(wallet);
  const props: any = {
    navigation: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.Settings, params: undefined },
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
        setServerOption={jest.fn()}
        setSelectServerOption={jest.fn()}
        setCurrencyOption={jest.fn()}
        setLanguageOption={jest.fn()}
        setSendAllOption={jest.fn()}
        setDonationOption={jest.fn()}
        setPrivacyOption={jest.fn()}
        setModeOption={jest.fn()}
        setBiometricsOption={jest.fn()}
        setSelectServerOptionCustom={jest.fn()}
        closeScreen={jest.fn()}
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
  expect(mockedFetchWallet).toHaveBeenCalledWith(false);
});
