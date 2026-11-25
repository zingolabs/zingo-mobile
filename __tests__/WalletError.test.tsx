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
        translate={mockTranslate}
        online={false}
        server={defaultAppContextLoading.server}
        failed={{ kind: 'only' }}
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

test('Tests that the screen names the wallet and offers another one when other wallets are on the device', () => {
  const onOpenOther = jest.fn();
  mount({ failed: { kind: 'oneOfMany', name: 'Savings', onOpenOther } });
  expect(screen.queryByTestId('walleterror.import')).toBeNull();
  fireEvent.press(screen.getByTestId('walleterror.other'));
  expect(onOpenOther).toHaveBeenCalledTimes(1);
});

test('Tests that the button shows a spinner and ignores presses while a retry is running', () => {
  const h = handlers();
  mount({ busy: true }, h);
  expect(screen.getByTestId('walleterror.open.spinner')).toBeOnTheScreen();
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
        translate={translate}
        online={false}
        server={remoteServer(
          'https://testnet.zec.rocks:443',
          ChainNameEnum.testChainName,
        )}
        failed={{ kind: 'only' }}
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

test('Tests that More options holds Import and Create behind a note that they add a wallet beside this one', () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  const h = mountChain();
  fireEvent.press(screen.getByTestId('walleterror.more'));
  expect(confirms[0].messageTone).toBeUndefined();
  expect(confirms[0].message).toContain('beside the Mainnet one');
  confirms[0].buttons[0].onPress?.();
  confirms[0].buttons[1].onPress?.();
  expect(h.onImport).toHaveBeenCalledTimes(1);
  expect(h.onCreate).toHaveBeenCalledTimes(1);
  registerConfirmListener(null);
});

const mountServer = (
  props: Partial<React.ComponentProps<typeof WalletError>>,
  h = handlers(),
) => {
  const en = require('../app/translations/en.json');
  const translate = (key: string) =>
    key.split('.').reduce((o: any, k) => o?.[k], en) ?? key;
  const extra = { onReport: jest.fn(), onCopied: jest.fn() };
  render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate }}
    >
      <WalletError
        translate={translate}
        online={true}
        server={remoteServer(
          'https://zec.global:443',
          ChainNameEnum.mainChainName,
        )}
        failed={{ kind: 'oneOfMany', name: 'Savings', onOpenOther: jest.fn() }}
        kind="server"
        details="connect ETIMEDOUT zec.global:443"
        busy={false}
        shake={0}
        {...h}
        {...extra}
        {...props}
      />
    </ContextAppLoadingProvider>,
  );
  return { ...h, ...extra };
};

test('Tests that a server error offers only Change server and Retry connection, without wallet actions', () => {
  const h = mountServer({});
  expect(screen.getByText("Can't connect to the server")).toBeOnTheScreen();
  expect(
    screen.getByText(
      "zec.global isn't responding. Your wallet is still saved on this device.",
    ),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('walleterror.import')).toBeNull();
  expect(screen.queryByTestId('walleterror.create')).toBeNull();
  expect(screen.queryByTestId('walleterror.other')).toBeNull();
  fireEvent.press(screen.getByTestId('walleterror.change-server'));
  fireEvent.press(screen.getByTestId('walleterror.retry'));
  expect(h.onServer).toHaveBeenCalledTimes(1);
  expect(h.onRetry).toHaveBeenCalledTimes(1);
});

test('Tests that the title says it still cannot connect when a retry failed, and a failed create says no wallet was created', () => {
  mountServer({ retried: true, stage: { kind: 'create', name: 'Wallet 1' } });
  expect(screen.getByText("Still can't reach the server")).toBeOnTheScreen();
  expect(
    screen.getByText("zec.global isn't responding. No wallet was created."),
  ).toBeOnTheScreen();
});

test('Tests that a running retry shows Retrying with a spinner and holds both actions', () => {
  const h = mountServer({ busy: true });
  expect(screen.getByText('Retrying…')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.retry.spinner')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('walleterror.change-server'));
  fireEvent.press(screen.getByTestId('walleterror.retry'));
  expect(h.onServer).not.toHaveBeenCalled();
  expect(h.onRetry).not.toHaveBeenCalled();
});

test('Tests that the server error details copy the text and mail it to support', () => {
  const h = mountServer({});
  fireEvent.press(screen.getByTestId('walleterror.details'));
  fireEvent.press(screen.getAllByTestId('walleterror.copy').at(-1)!);
  fireEvent.press(screen.getAllByTestId('walleterror.email').at(-1)!);
  expect(h.onCopied).toHaveBeenCalledTimes(1);
  expect(h.onReport).toHaveBeenCalledTimes(1);
});

test('Tests that the error badge draws its exclamation as an icon when the wallet will not open', () => {
  mount({});
  expect(screen.queryByText('!')).toBeNull();
});
