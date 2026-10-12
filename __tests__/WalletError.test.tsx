import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import WalletError from '@screens/WalletError';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import {
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const handlers = () => ({
  onRetry: jest.fn(),
  onImport: jest.fn(),
  onCreate: jest.fn(),
  onServer: jest.fn(),
  onSwitchChain: jest.fn(),
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
  expect(
    screen.getAllByText('failed to read wallet file').length,
  ).toBeGreaterThan(0);
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

const mountChain = (h = handlers()) => {
  const en = require('../app/translations/en.json');
  const translate = (key: string) =>
    key.split('.').reduce((o: any, k) => o?.[k], en) ?? key;
  render(
    <ContextAppLoadingProvider
      value={{
        ...defaultAppContextLoading,
        translate,
        server: remoteServer(
          'https://testnet.zec.rocks:443',
          ChainNameEnum.testChainName,
        ),
      }}
    >
      <WalletError
        kind="chain"
        walletChain={ChainNameEnum.mainChainName}
        details="Wallet chain: main"
        busy={false}
        shake={0}
        {...h}
      />
    </ContextAppLoadingProvider>,
  );
  return h;
};

test('Tests that a wallet on another network names both networks and offers to switch instead of a retry', () => {
  const h = mountChain();
  expect(screen.getByText('This wallet is on Mainnet')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.netbadge')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.chip.wallet')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.chip.server')).toBeOnTheScreen();
  expect(screen.queryByTestId('walleterror.open')).toBeNull();
  expect(screen.queryByTestId('walleterror.create')).toBeNull();

  fireEvent.press(screen.getByText('Switch to Mainnet'));
  expect(h.onSwitchChain).toHaveBeenCalledWith(ChainNameEnum.mainChainName);
  expect(h.onRetry).not.toHaveBeenCalled();
});

test('Tests that More options holds Import and Create behind a warning that they replace the wallet', () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  const h = mountChain();
  fireEvent.press(screen.getByTestId('walleterror.more'));
  expect(confirms[0].messageTone).toBe('danger');
  expect(confirms[0].message).toContain('replace the Mainnet wallet');
  confirms[0].buttons[0].onPress?.();
  confirms[0].buttons[1].onPress?.();
  expect(h.onImport).toHaveBeenCalledTimes(1);
  expect(h.onCreate).toHaveBeenCalledTimes(1);
  registerConfirmListener(null);
});
