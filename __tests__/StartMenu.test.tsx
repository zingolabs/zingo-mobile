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
        recoveryEntries={[]}
        importAllRecovery={jest.fn()}
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
        recoveryEntries={[]}
        importAllRecovery={jest.fn()}
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

test('Tests that several saved wallets show one card that imports them all, without the seed, when a previous install left more than one', () => {
  const importAllRecovery = jest.fn();
  const entry = (walletId: string, name: string, order: number) => ({
    walletId,
    name,
    order,
    seed: 'abandon ability',
    birthday: 1994579,
    chain: 'main',
    category: 2,
  });
  render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate: (key: string) => key }}
    >
      <StartMenu
        actionButtonsDisabled={false}
        recoveryWallet={{ seed: 'abandon ability', birthday: 1994579 }}
        recoveryEntries={[entry('a', 'Savings', 1), entry('b', 'Spending', 2)]}
        importAllRecovery={importAllRecovery}
        freshInstall={true}
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
  expect(screen.getByText('Savings')).toBeOnTheScreen();
  expect(screen.getByText('Spending')).toBeOnTheScreen();
  expect(screen.queryByTestId('loadingapp.viewseed')).toBeNull();
  expect(screen.queryByTestId('loadingapp.importthis')).toBeNull();
  fireEvent.press(screen.getByTestId('loadingapp.importall'));
  expect(importAllRecovery).toHaveBeenCalled();
});
