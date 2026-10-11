import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import StartMenu from '@screens/StartMenu';

const mount = (freshInstall: boolean) => {
  const noop = jest.fn();
  return render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate: (key: string) => key }}
    >
      <StartMenu
        actionButtonsDisabled={false}
        recoveryWallet={{ seed: 'abandon ability', birthday: 1994579 }}
        freshInstall={freshInstall}
        importRecoveryWallet={noop}
        viewRecoveryWallet={noop}
        customServer={noop}
        walletExists={false}
        openCurrentWallet={noop}
        createNewWallet={noop}
        getwalletToRestore={noop}
      />
    </ContextAppLoadingProvider>,
  );
};

test('Tests that the saved wallet card speaks of a previous install when the app was just installed', () => {
  mount(true);
  expect(
    screen.getByText('loadingapp.previous-install-title'),
  ).toBeOnTheScreen();
  expect(screen.queryByText('loadingapp.saved-wallet-title')).toBeNull();
});

test('Tests that the saved wallet card speaks of a wallet saved on the device when the app was already in use', () => {
  mount(false);
  expect(screen.getByText('loadingapp.saved-wallet-title')).toBeOnTheScreen();
  expect(screen.queryByText('loadingapp.previous-install-title')).toBeNull();
});

test('Tests that only the pressed button shows its spinner when the work starts', () => {
  const tree = (busy: boolean) => (
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate: (key: string) => key }}
    >
      <StartMenu
        actionButtonsDisabled={busy}
        recoveryWallet={{ seed: 'abandon ability', birthday: 1994579 }}
        freshInstall={false}
        importRecoveryWallet={jest.fn()}
        viewRecoveryWallet={jest.fn()}
        customServer={jest.fn()}
        walletExists={false}
        openCurrentWallet={jest.fn()}
        createNewWallet={jest.fn()}
        getwalletToRestore={jest.fn()}
      />
    </ContextAppLoadingProvider>
  );
  render(tree(false));
  fireEvent.press(screen.getByTestId('loadingapp.importthis'));
  screen.rerender(tree(true));
  expect(screen.getByTestId('loadingapp.importthis.spinner')).toBeOnTheScreen();
  expect(screen.queryByTestId('loadingapp.createnewwallet.spinner')).toBeNull();
});

const mountWithNet = (isConnected: boolean, isInternetReachable: boolean) =>
  render(
    <ContextAppLoadingProvider
      value={{
        ...defaultAppContextLoading,
        translate: (key: string) => key,
        netInfo: {
          isConnected,
          isInternetReachable,
          type: 'wifi' as never,
          isConnectionExpensive: false,
        },
      }}
    >
      <StartMenu
        actionButtonsDisabled={false}
        recoveryWallet={null}
        freshInstall={false}
        importRecoveryWallet={jest.fn()}
        viewRecoveryWallet={jest.fn()}
        customServer={jest.fn()}
        walletExists={false}
        openCurrentWallet={jest.fn()}
        createNewWallet={jest.fn()}
        getwalletToRestore={jest.fn()}
      />
    </ContextAppLoadingProvider>,
  );

test('Tests that a network without internet access says so, apart from no network', () => {
  mountWithNet(true, false);
  expect(screen.getByText('loadingapp.no-access')).toBeOnTheScreen();
  expect(screen.getByText('loadingapp.no-access-line')).toBeOnTheScreen();
  expect(screen.queryByText('loadingapp.no-internet')).toBeNull();
});

test('Tests that no network keeps the no internet notice', () => {
  mountWithNet(false, false);
  expect(screen.getByText('loadingapp.no-internet')).toBeOnTheScreen();
  expect(screen.queryByText('loadingapp.no-access')).toBeNull();
});

test('Tests that a network that reaches the internet shows no notice', () => {
  mountWithNet(true, true);
  expect(screen.queryByText('loadingapp.no-access')).toBeNull();
  expect(screen.queryByText('loadingapp.no-internet')).toBeNull();
});
