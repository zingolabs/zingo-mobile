import 'react-native';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';

import OptionsPanel from '@screens/OptionsPanel/OptionsPanel';

const renderPanel = (badge: boolean) =>
  render(
    <ContextAppLoadedProvider
      value={{ ...defaultAppContextLoaded, translate: (k: string) => k }}
    >
      <OptionsPanel
        actions={[
          {
            id: 'seed',
            testID: 'menu.walletseed',
            label: 'Wallet Seed',
            icon: React.createElement('View'),
            onPress: jest.fn(),
            badge,
          },
        ]}
        title="Options"
        onClose={jest.fn()}
      />
    </ContextAppLoadedProvider>,
  );

test('Tests that the Wallet Seed tile carries a badge when the seed is not backed up.', () => {
  renderPanel(true);
  expect(screen.getByTestId('menu.walletseed.badge')).toBeTruthy();
});

test('Tests that the tile has no badge when the seed is backed up.', () => {
  renderPanel(false);
  expect(screen.queryByTestId('menu.walletseed.badge')).toBeNull();
});
