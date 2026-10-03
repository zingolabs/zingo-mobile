import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
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
