import 'react-native';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import {
  ContextAppLoadingProvider,
  defaultAppContextLoading,
} from '@app/context';
import WalletError from '@screens/WalletError';
import { ChainNameEnum, RouteEnum, remoteServer } from '@app/AppState';
import { WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';
import {
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';
import { mockTranslate } from '../__mocks__/dataMocks/mockTranslate';

const openError: WalletErrorInfo = {
  kind: 'open',
  details: 'failed to read wallet file',
};

const mount = (
  error: WalletErrorInfo,
  props: Partial<React.ComponentProps<typeof WalletError>> = {},
  translate: typeof defaultAppContextLoading.translate = mockTranslate,
  server = defaultAppContextLoading.server,
) => {
  const onAction = jest.fn();
  render(
    <ContextAppLoadingProvider
      value={{ ...defaultAppContextLoading, translate, server }}
    >
      <WalletError
        error={error}
        busy={false}
        shake={0}
        onAction={onAction}
        {...props}
      />
    </ContextAppLoadingProvider>,
  );
  return onAction;
};

test('Tests that the error text stays hidden until the details toggle is pressed', () => {
  mount(openError);
  expect(screen.queryByText('failed to read wallet file')).toBeNull();
  fireEvent.press(screen.getByTestId('walleterror.details'));
  expect(
    screen.getAllByText('failed to read wallet file').length,
  ).toBeGreaterThan(0);
});

test('Tests that each action reaches the host when the screen is idle', () => {
  const onAction = mount(openError);
  fireEvent.press(screen.getByTestId('walleterror.open'));
  fireEvent.press(screen.getByTestId('walleterror.import'));
  fireEvent.press(screen.getByTestId('walleterror.create'));
  fireEvent.press(screen.getByTestId('walleterror.server'));
  expect(onAction.mock.calls.map(([a]) => a)).toEqual([
    { kind: 'retry' },
    { kind: 'import' },
    { kind: 'create' },
    { kind: 'server' },
  ]);
});

test('Tests that the button shows dots and ignores presses while a retry is running', () => {
  const onAction = mount(openError, { busy: true });
  expect(screen.getByTestId('walleterror.open.dots')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('walleterror.open'));
  fireEvent.press(screen.getByTestId('walleterror.import'));
  fireEvent.press(screen.getByTestId('walleterror.create'));
  fireEvent.press(screen.getByTestId('walleterror.report'));
  expect(onAction).not.toHaveBeenCalled();
});

const en: Record<string, string> = {
  'walleterror.chain-title': 'This wallet is on {net}',
  'walleterror.chain-sub':
    "Zingo is connected to a {server} server, so it can't open this wallet.",
  'walleterror.chain-action': 'Switch to {net}',
  'walleterror.more': 'More options',
  'walleterror.more-warn': 'These replace the {net} wallet on this phone.',
  'walleterror.more-import': 'Import another wallet',
  'walleterror.more-create': 'Create new wallet',
  'walleterror.server-title': "Can't connect to the server",
  'walleterror.server-sub': "{host} isn't responding.",
  'walleterror.retry': 'Try again',
  'walleterror.back': 'Back',
  'settings.value-chainname-main': 'Mainnet',
  'settings.value-chainname-test': 'Testnet',
  cancel: 'Cancel',
};
const translateEn = (key: string) => en[key] ?? key;
const testnet = remoteServer(
  'https://testnet.example:443',
  ChainNameEnum.testChainName,
);

const mountChain = () =>
  mount(
    {
      kind: 'chain',
      details: 'wallet chain name mainnet',
      walletChain: ChainNameEnum.mainChainName,
    },
    {},
    translateEn,
    testnet,
  );

test('Tests that a wallet on another network names both networks and offers to switch instead of a retry', () => {
  const onAction = mountChain();
  expect(screen.getByText('This wallet is on Mainnet')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.netbadge')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.chip.wallet')).toBeOnTheScreen();
  expect(screen.getByTestId('walleterror.chip.server')).toBeOnTheScreen();
  expect(screen.queryByTestId('walleterror.open')).toBeNull();
  expect(screen.queryByTestId('walleterror.create')).toBeNull();

  fireEvent.press(screen.getByText('Switch to Mainnet'));
  expect(onAction).toHaveBeenCalledWith({
    kind: 'chain',
    chain: ChainNameEnum.mainChainName,
  });
});

test('Tests that More options holds Import and Create behind a warning that they replace the wallet', () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  const onAction = mountChain();
  fireEvent.press(screen.getByTestId('walleterror.more'));
  expect(confirms[0].messageTone).toBe('danger');
  expect(confirms[0].message).toContain('replace the Mainnet wallet');
  confirms[0].buttons[0].onPress?.();
  confirms[0].buttons[1].onPress?.();
  expect(onAction.mock.calls.map(([a]) => a)).toEqual([
    { kind: 'import' },
    { kind: 'create' },
  ]);
  registerConfirmListener(null);
});

test('Tests that a failed create names the server and offers Retry and Back in place of Open, Import and Create', () => {
  const onAction = mount(
    { kind: 'init', details: 'transport error', step: { kind: 'create' } },
    {},
    translateEn,
    testnet,
  );
  expect(screen.getByText("Can't connect to the server")).toBeOnTheScreen();
  expect(
    screen.getByText("testnet.example:443 isn't responding."),
  ).toBeOnTheScreen();
  expect(screen.queryByTestId('walleterror.open')).toBeNull();
  expect(screen.queryByTestId('walleterror.import')).toBeNull();
  expect(screen.queryByTestId('walleterror.create')).toBeNull();
  fireEvent.press(screen.getByText('Try again'));
  fireEvent.press(screen.getByText('Back'));
  expect(onAction.mock.calls.map(([a]) => a)).toEqual([
    { kind: 'retry' },
    { kind: 'back' },
  ]);
});

test('Tests that Send report hands the host the translated title as the subject', () => {
  const onAction = mount(
    {
      kind: 'init',
      details: 'transport error',
      step: {
        kind: 'restore',
        seedUfvk: 'abandon',
        birthday: 0,
        origin: RouteEnum.ImportUfvk,
      },
    },
    {},
    translateEn,
    testnet,
  );
  fireEvent.press(screen.getByTestId('walleterror.report'));
  expect(onAction).toHaveBeenCalledWith({
    kind: 'report',
    subject: "Can't connect to the server",
  });
});
