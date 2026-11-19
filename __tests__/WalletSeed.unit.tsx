import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { Route } from '@app/AppState';
import { copySensitive } from '@app/utils/sensitiveClipboard';

import WalletSeed from '@screens/WalletSeed';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const UFVK = 'uview1k8q4m2xw7d0yq5cv3t9ln6r2hfj8sa4e0ux7d2p';

jest.mock('@app/services/recoveryWalletInfo', () => ({
  getRecoveryWalletInfo: jest.fn(async () => ({
    seed: Array.from({ length: 24 }, (_, i) => `w${i}`).join(' '),
    birthday: 3512840,
  })),
}));

jest.mock('@app/services/showConfirm', () => ({ showConfirm: jest.fn() }));
jest.mock('@app/utils/sensitiveClipboard', () => ({
  copySensitive: jest.fn(),
}));

jest.mock('@app/walletBackend', () => ({
  fetchWallet: jest.fn(async () => ({
    ufvk: 'uview1k8q4m2xw7d0yq5cv3t9ln6r2hfj8sa4e0ux7d2p',
  })),
}));

const renderScreen = (
  seedBackedUp: boolean,
  seedBackedUpAt = 0,
  readOnly = false,
) =>
  render(
    <ContextAppLoadedProvider
      value={{
        ...defaultAppContextLoaded,
        translate: (k: string) => k,
        biometrics: false,
        seedBackedUp,
        seedBackedUpAt,
        readOnly,
        birthday: 3512840,
      }}
    >
      <WalletSeed
        navigation={mockNavigation}
        route={{
          key: 'k',
          name: Route.WalletSeed,
          params: undefined,
        }}
      />
    </ContextAppLoadedProvider>,
  );

beforeEach(() => {
  (mockNavigation.navigate as jest.Mock).mockClear();
});

test('Tests that Back up pushes the backup flow when the seed is not backed up.', async () => {
  renderScreen(false);
  await act(async () => {});
  expect(screen.getByTestId('walletseed.no')).toBeTruthy();
  fireEvent.press(screen.getByTestId('walletseed.backup'));
  expect(mockNavigation.navigate).toHaveBeenCalledWith(Route.SeedBackup, {
    entry: { kind: 'push' },
  });
});

test('Tests that Verify again opens the word check when the seed is backed up.', async () => {
  renderScreen(true, Date.UTC(2026, 9, 8));
  await act(async () => {});
  expect(screen.getByTestId('walletseed.ok')).toBeTruthy();
  fireEvent.press(screen.getByTestId('walletseed.actions.link'));
  expect(mockNavigation.navigate).toHaveBeenCalledWith(Route.SeedBackup, {
    entry: { kind: 'verify' },
  });
});

test('Tests that the viewing key shows its first and last characters only.', async () => {
  renderScreen(true);
  await act(async () => {});
  expect(
    screen.getByText(`${UFVK.slice(0, 10)}…${UFVK.slice(-6)}`),
  ).toBeTruthy();
});

test('Tests that a view-only wallet shows its hidden viewing key in place of the words and copies it with the birthday.', async () => {
  renderScreen(true, 0, true);
  await act(async () => {});
  expect(screen.queryByTestId('walletseed.words')).toBeNull();
  expect(screen.queryByTestId('walletseed.vk')).toBeNull();
  expect(screen.getByTestId('walletseed.vkcard.key').props.children).toBe(
    `${UFVK.slice(0, 6)}••••••…••••••••`,
  );

  fireEvent.press(screen.getByTestId('walletseed.copy'));
  expect(copySensitive).toHaveBeenCalledWith(
    `${UFVK}
seedbackup.birthday: 3512840`,
    expect.any(Function),
  );
});
