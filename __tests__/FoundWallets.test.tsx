import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import FoundWallets from '@screens/FoundWallets';
import type { RecoveryEntry } from '@app/services/recoveryWalletInfo';

const entry = (walletId: string, over: Partial<RecoveryEntry> = {}) => ({
  seed: 'abandon ability able',
  birthday: 2900000,
  walletId,
  name: walletId,
  chain: 'main',
  category: 1,
  order: 0,
  server: { kind: 'none' } as const,
  ...over,
});

test('Tests that the button imports only the ticked wallets when one is unticked', () => {
  const onImport = jest.fn();
  const entries = [
    entry('a'),
    entry('b'),
    entry('c', { seed: undefined, ufvk: 'uview1' }),
  ];
  render(
    <FoundWallets
      translate={(key: string) => key}
      entries={entries}
      busy={false}
      onImport={onImport}
      onBack={jest.fn()}
    />,
  );
  expect(screen.getByText('found.import-all')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('found.row.1'));
  expect(screen.getByText('found.import-n')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('found.import'));
  expect(onImport).toHaveBeenCalledWith([entries[0], entries[2]]);
});
