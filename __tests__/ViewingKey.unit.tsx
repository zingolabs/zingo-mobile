import 'react-native';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadedProvider,
  defaultAppContextLoaded,
} from '@app/context';
import { ChainNameEnum, RouteEnum } from '@app/AppState';
import {
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';

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

const onConfirm = jest.fn(async () => {});
const onCancel = jest.fn(async () => {});

afterEach(() => {
  jest.clearAllMocks();
  registerConfirmListener(null);
});

const renderKey = (switchTo?: ChainNameEnum) =>
  render(
    <ContextAppLoadedProvider value={context}>
      <ViewingKey
        navigation={mockNavigation}
        route={{
          key: 'k',
          name: RouteEnum.ViewingKey,
          params: { entry: { kind: 'push' }, switchTo },
        }}
        onConfirm={onConfirm}
        onCancel={onCancel}
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

test('Tests that the view-only card offers the viewing key and closes with its X.', () => {
  const onDismiss = jest.fn();
  render(
    <ContextAppLoadedProvider value={context}>
      <ViewOnlyNotice onViewKey={jest.fn()} onDismiss={onDismiss} />
    </ContextAppLoadedProvider>,
  );
  expect(screen.getByText('viewonly.title')).toBeTruthy();
  expect(screen.getByText('viewonly.button')).toBeTruthy();
  fireEvent.press(screen.getByTestId('viewonly.dismiss'));
  expect(onDismiss).toHaveBeenCalledTimes(1);
});

test('Tests that Switch moves the wallet to the other network only after the confirm.', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  renderKey(ChainNameEnum.testChainName);
  await act(async () => {});
  expect(screen.getByText('viewingkey.switch-title')).toBeTruthy();
  expect(screen.getByText('viewingkey.switch')).toBeTruthy();

  fireEvent.press(screen.getByTestId('viewingkey.done'));
  expect(confirms[0].message).toBe('viewingkey.switch-warning');
  expect(onConfirm).not.toHaveBeenCalled();
  await act(async () => {
    await confirms[0].buttons[0].onPress?.();
  });
  expect(onConfirm).toHaveBeenCalledTimes(1);
  expect(onCancel).not.toHaveBeenCalled();
});

test('Tests that the X leaves the network change without moving the wallet.', async () => {
  renderKey(ChainNameEnum.testChainName);
  await act(async () => {});
  await act(async () => {
    fireEvent.press(screen.getByTestId('viewingkey.close'));
  });
  expect(onCancel).toHaveBeenCalledTimes(1);
  expect(onConfirm).not.toHaveBeenCalled();
});
