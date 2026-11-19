import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { Route, TranslateType } from '@app/AppState';
import NewWallet from '@screens/AddWallet/NewWallet';
import { defaultWalletName } from '@screens/AddWallet/draftParts';

const en = require('../app/translations/en.json');
const translate = (key: string): TranslateType =>
  key.split('.').reduce((o, k) => o?.[k], en) ?? key;

const wallet = (id: string, name: string) => ({
  id,
  hasFile: true,
  meta: { v: 1, id, order: 1, createdAt: 0, name },
});

const params = {
  walletId: 'w9',
  arrival: 'switch' as const,
  next: 'home' as const,
  notice: '',
  readOnly: false,
  orchardPool: true,
  saplingPool: true,
  transparentPool: true,
  newWallet: true,
  firstLaunchingMessage: 'opening' as never,
  walletChainName: 'main' as never,
};

const mount = (overrides: object) =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate,
        wallets: [wallet('w1', 'Wallet 1'), wallet('w2', 'Savings')],
        ...overrides,
      }}
    >
      <NewWallet
        navigation={{ goBack: jest.fn(), navigate: jest.fn() } as never}
        route={{ key: 'new', name: Route.NewWallet } as never}
      />
    </ContextAppLoadedProvider>,
  );

test('Tests that the default name takes the lowest number no wallet uses', () => {
  expect(defaultWalletName(translate, ['Wallet 1', 'Wallet 3'])).toBe(
    'Wallet 2',
  );
  expect(defaultWalletName(translate, [])).toBe('Wallet 1');
});

test('Tests that a new wallet is named after the placeholder and offers its backup when the name is left empty', async () => {
  const addWallet = jest.fn(async () => ({
    kind: 'added',
    name: 'Wallet 2',
    params,
  }));
  const enterAdded = jest.fn();
  mount({ addWallet, enterAdded });

  await act(async () => {
    fireEvent.press(screen.getByTestId('newwallet.go'));
  });

  expect(addWallet).toHaveBeenCalledWith(
    { kind: 'create' },
    'Wallet 2',
    expect.anything(),
  );
  expect(screen.getByText('Wallet 2 is ready')).toBeTruthy();
  fireEvent.press(screen.getByTestId('addwallet.later'));
  expect(enterAdded).toHaveBeenCalledWith(
    params,
    'home',
    en.add['later-toast'],
  );
});

test('Tests that a wallet that is not added returns to the form with the reason when the add fails', async () => {
  const addWallet = jest.fn(async () => ({ kind: 'failed', message: 'boom' }));
  const addLastSnackbar = jest.fn();
  mount({ addWallet, addLastSnackbar });

  await act(async () => {
    fireEvent.press(screen.getByTestId('newwallet.go'));
  });

  expect(addLastSnackbar).toHaveBeenCalledWith(
    en.add.error.replace('{error}', 'boom'),
  );
  expect(screen.getByTestId('newwallet.go')).toBeTruthy();
});
