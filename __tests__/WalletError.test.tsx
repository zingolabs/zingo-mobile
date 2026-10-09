import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import WalletError from '@screens/WalletError';
import { ChainNameEnum } from '@app/AppState';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const handlers = () => ({
  onRetry: jest.fn(),
  onImport: jest.fn(),
  onCreate: jest.fn(),
  onServer: jest.fn(),
});

const mount = (
  props: Partial<React.ComponentProps<typeof WalletError>>,
  h = handlers(),
) =>
  render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate: mockTranslate }}
    >
      <WalletError
        kind="open"
        details="failed to read wallet file"
        busy={false}
        shake={0}
        {...h}
        {...props}
      />
    </ContextAppLoadingProvider>,
  );

test('Tests that the error text stays hidden until the details toggle is pressed', () => {
  mount({});
  expect(screen.queryByText('failed to read wallet file')).toBeNull();
  fireEvent.press(screen.getByTestId('walleterror.details'));
  expect(screen.getByText('failed to read wallet file')).toBeOnTheScreen();
});

test('Tests that each action reaches its handler when the screen is idle', () => {
  const h = handlers();
  mount({}, h);
  fireEvent.press(screen.getByTestId('walleterror.open'));
  fireEvent.press(screen.getByTestId('walleterror.import'));
  fireEvent.press(screen.getByTestId('walleterror.create'));
  fireEvent.press(screen.getByTestId('walleterror.server'));
  expect(h.onRetry).toHaveBeenCalledTimes(1);
  expect(h.onImport).toHaveBeenCalledTimes(1);
  expect(h.onCreate).toHaveBeenCalledTimes(1);
  expect(h.onServer).toHaveBeenCalledTimes(1);
});

test('Tests that the button shows dots and ignores presses while a retry is running', () => {
  const h = handlers();
  mount({ busy: true }, h);
  expect(screen.getByTestId('walleterror.open.dots')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('walleterror.open'));
  fireEvent.press(screen.getByTestId('walleterror.import'));
  expect(h.onRetry).not.toHaveBeenCalled();
  expect(h.onImport).not.toHaveBeenCalled();
});

test('Tests that a wallet on another network offers a server on its network instead of a retry', () => {
  const en = require('../app/translations/en.json');
  const translate = (key: string) =>
    key.split('.').reduce((o: any, k) => o?.[k], en) ?? key;
  const h = handlers();
  render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate }}
    >
      <WalletError
        kind="chain"
        walletChain={ChainNameEnum.mainChainName}
        details="wallet: main"
        busy={false}
        shake={0}
        {...h}
      />
    </ContextAppLoadingProvider>,
  );
  expect(screen.getByText('This is a Mainnet wallet')).toBeOnTheScreen();
  expect(screen.queryByTestId('walleterror.open')).toBeNull();
  fireEvent.press(screen.getByTestId('walleterror.chain'));
  expect(h.onServer).toHaveBeenCalledTimes(1);
  expect(h.onRetry).not.toHaveBeenCalled();
});
