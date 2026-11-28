import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import WalletSwitcher from '@ui/widgets/Header/components/WalletSwitcher';

test('Tests that the switcher only names the open wallet when the screen gives it no press', () => {
  render(
    <WalletSwitcher name="Wallet 1" category={1} accessibilityLabel="Change" />,
  );
  expect(screen.getByTestId('header.wallet')).toBeTruthy();
  expect(screen.queryByTestId('header.wallets')).toBeNull();
});

test('Tests that the switcher opens Wallets when the screen gives it a press', () => {
  render(
    <WalletSwitcher
      name="Wallet 1"
      category={1}
      accessibilityLabel="Change"
      onPress={() => {}}
    />,
  );
  expect(screen.getByTestId('header.wallets')).toBeTruthy();
});
