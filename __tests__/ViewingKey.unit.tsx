import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { RouteEnum } from '@app/AppState';

import ViewingKey from '@screens/ViewingKey';
import ViewOnlyNotice from '@screens/History/components/ViewOnlyNotice';
import { copySensitive } from '@app/utils/sensitiveClipboard';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

const UFVK =
  'uview1qg8x2m5k7d9w3e6r4t0yhu2jn8ls5c7v3b6nq9pz4xw2k8e5r7t1ym3gd6hf0jn2ks8al4xq7wv9cz5eb3rt6yu1io0pl8mk2nj4hb7gv5fc3dx9sz6aq';

jest.mock('@app/services/recoveryWalletInfo', () => ({
  getRecoveryWalletInfo: jest.fn(async () => ({
    ufvk: 'uview1qg8x2m5k7d9w3e6r4t0yhu2jn8ls5c7v3b6nq9pz4xw2k8e5r7t1ym3gd6hf0jn2ks8al4xq7wv9cz5eb3rt6yu1io0pl8mk2nj4hb7gv5fc3dx9sz6aq',
  })),
}));
jest.mock('@app/walletBackend', () => ({ fetchWallet: jest.fn() }));
jest.mock('@app/utils/sensitiveClipboard', () => ({
  copySensitive: jest.fn(),
}));

const context = {
  ...defaultAppContextLoaded,
  translate: (k: string) => k,
  biometrics: false,
};

const renderKey = () =>
  render(
    <ContextAppLoadedProvider value={context}>
      <ViewingKey
        navigation={mockNavigation}
        route={{
          key: 'k',
          name: RouteEnum.ViewingKey,
          params: { entry: { kind: 'push' } },
        }}
      />
    </ContextAppLoadedProvider>,
  );

test('Tests that the key starts masked and shows its two ends when Show is pressed.', async () => {
  renderKey();
  await act(async () => {});
  expect(screen.getByTestId('viewingkey.key').props.children).toBe(
    `${UFVK.slice(0, 6)}••••••…••••••••`,
  );
  await act(async () => {
    fireEvent.press(screen.getByTestId('viewingkey.hide'));
  });
  expect(screen.getByTestId('viewingkey.key').props.children).toBe(
    `${UFVK.slice(0, 12)}…${UFVK.slice(-8)}`,
  );
});

test('Tests that Copy takes the whole key while it is still hidden.', async () => {
  renderKey();
  await act(async () => {});
  await act(async () => {
    fireEvent.press(screen.getByTestId('viewingkey.copy'));
  });
  expect(copySensitive).toHaveBeenCalledWith(UFVK, expect.any(Function));
});

test('Tests that the view-only card offers the viewing key.', () => {
  const onViewKey = jest.fn();
  render(
    <ContextAppLoadedProvider value={context}>
      <ViewOnlyNotice onViewKey={onViewKey} />
    </ContextAppLoadedProvider>,
  );
  expect(screen.getByText('viewonly.title')).toBeTruthy();
  expect(screen.getByText('viewonly.button')).toBeTruthy();
});
