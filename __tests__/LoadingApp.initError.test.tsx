/**
 * @format
 */

import 'react-native';

import { LoadingAppClass } from '@app/LoadingApp';
import {
  ChainNameEnum,
  LanguageEnum,
  LaunchingModeEnum,
  RouteEnum,
  SelectServerEnum,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import { WalletErrorInfo } from '@app/AppState/types/WalletErrorInfo';
import { LoadOutcome } from '@app/LoadingApp/walletFailure';
import { createAlert } from '@app/services/createAlert';
import { sendEmail } from '@app/services/sendEmail';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/services/createAlert', () => ({ createAlert: jest.fn() }));
jest.mock('@app/services/sendEmail', () => ({ sendEmail: jest.fn() }));

const initError: WalletErrorInfo = {
  cause: { kind: 'connection' },
  step: { kind: 'create' },
  details: 'transport error',
};

const restoreError: WalletErrorInfo = {
  cause: { kind: 'connection' },
  details: 'transport error',
  step: {
    kind: 'restore',
    seedUfvk: 'uviewtest1abc',
    birthday: 2_000_000,
    origin: RouteEnum.ImportUfvk,
  },
};

// The class runs without mounting, so setState merges into `state` here
// in place of React's queue.
const bootApp = () => {
  const app = new LoadingAppClass({
    navigationApp: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.LoadingApp, params: undefined },
    translate: (key: string) => key,
    language: LanguageEnum.en,
    server: remoteServer(
      'https://testnet.example:443',
      ChainNameEnum.testChainName,
    ),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometrics: false,
    selectServer: SelectServerEnum.custom,
  } as never);
  jest.spyOn(app, 'setState').mockImplementation((update, after) => {
    const patch =
      typeof update === 'function' ? update(app.state, app.props) : update;
    app.state = { ...app.state, ...patch };
    after?.();
  });
  const snackbar = jest
    .spyOn(app, 'addLastSnackbar')
    .mockImplementation(() => {});
  const navigate = jest
    .spyOn(app, 'navigateToLoadedApp')
    .mockImplementation(() => {});
  const loadExistingWalletOnBoot = jest
    .spyOn(app, 'loadExistingWalletOnBoot')
    .mockResolvedValue({ kind: 'loaded' });
  const createNewWallet = jest
    .spyOn(app, 'createNewWallet')
    .mockResolvedValue({ kind: 'loaded' });
  const doRestore = jest
    .spyOn(app, 'doRestore')
    .mockResolvedValue({ kind: 'loaded' });
  return {
    app,
    snackbar,
    navigate,
    loadExistingWalletOnBoot,
    createNewWallet,
    doRestore,
  };
};

const busy = (app: LoadingAppClass) => ({
  retrying: app.state.retrying,
  actionButtonsDisabled: app.state.actionButtonsDisabled,
});

const outcomes: LoadOutcome[] = [
  { kind: 'loaded' },
  { kind: 'error', error: initError },
  {
    kind: 'alert',
    origin: RouteEnum.StartMenu,
    labelKey: 'loadingapp.creatingwallet-label',
    error: 'boom',
  },
  {
    kind: 'rejected',
    origin: RouteEnum.ImportUfvk,
    labelKey: 'loadingapp.invalidseedufvk-label',
    errorKey: 'loadingapp.invalidseedufvk-error',
  },
  { kind: 'offline' },
];

beforeEach(() => jest.clearAllMocks());

test.each(outcomes)(
  'Tests that the busy state clears when a $kind outcome settles',
  outcome => {
    const { app } = bootApp();
    app.state = { ...app.state, retrying: true, actionButtonsDisabled: true };

    app.settle({ kind: 'first', outcome });

    expect(busy(app)).toEqual({
      retrying: false,
      actionButtonsDisabled: false,
    });
  },
);

test('Tests that an error outcome lands on the error screen without a shake on a first attempt', () => {
  const { app, snackbar } = bootApp();

  app.settle({ kind: 'first', outcome: { kind: 'error', error: initError } });

  expect(app.state.screen).toBe(RouteEnum.WalletError);
  expect(app.state.walletError).toEqual(initError);
  expect(app.state.errorShake).toBe(0);
  expect(snackbar).not.toHaveBeenCalled();
});

test('Tests that an error outcome shakes and says so when it settles a retry', () => {
  const { app, snackbar } = bootApp();

  app.settle({
    kind: 'again',
    retry: { kind: 'create' },
    outcome: { kind: 'error', error: initError },
  });

  expect(app.state.errorShake).toBe(1);
  expect(snackbar).toHaveBeenCalledWith('walleterror.still-server');
});

test('Tests that an alert outcome returns to its origin with the report button', () => {
  const { app } = bootApp();

  app.settle({ kind: 'first', outcome: outcomes[2] });

  expect(app.state.screen).toBe(RouteEnum.StartMenu);
  expect(createAlert).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    'loadingapp.creatingwallet-label',
    'boom',
    false,
    expect.any(Function),
    expect.any(Function),
    '',
  );
});

test('Tests that a rejected outcome returns to its origin without the report button', () => {
  const { app } = bootApp();

  app.settle({ kind: 'first', outcome: outcomes[3] });

  expect(app.state.screen).toBe(RouteEnum.ImportUfvk);
  expect(createAlert).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    'loadingapp.invalidseedufvk-label',
    'loadingapp.invalidseedufvk-error',
    false,
    expect.any(Function),
  );
});

test('Tests that an offline outcome says the connection is missing and stays put', () => {
  const { app, snackbar } = bootApp();
  app.state = { ...app.state, screen: RouteEnum.StartMenu };

  app.settle({ kind: 'first', outcome: { kind: 'offline' } });

  expect(app.state.screen).toBe(RouteEnum.StartMenu);
  expect(snackbar).toHaveBeenCalledWith('loadedapp.connection-error');
});

test('Tests that the busy state clears when a retried create settles as an alert', async () => {
  const { app, createNewWallet } = bootApp();
  app.state = {
    ...app.state,
    screen: RouteEnum.WalletError,
    walletError: initError,
  };
  createNewWallet.mockResolvedValue(outcomes[2]);

  await app.retryWalletError();

  expect(busy(app)).toEqual({ retrying: false, actionButtonsDisabled: false });
  expect(app.state.screen).toBe(RouteEnum.StartMenu);
});

test('Tests that a retried restore returns to its origin with the buttons enabled when its key is rejected', async () => {
  const { app, doRestore } = bootApp();
  app.state = {
    ...app.state,
    screen: RouteEnum.WalletError,
    walletError: restoreError,
  };
  doRestore.mockResolvedValue(outcomes[3]);

  await app.retryWalletError();

  expect(doRestore).toHaveBeenCalledWith(
    'uviewtest1abc',
    2_000_000,
    RouteEnum.ImportUfvk,
  );
  expect(busy(app)).toEqual({ retrying: false, actionButtonsDisabled: false });
  expect(app.state.screen).toBe(RouteEnum.ImportUfvk);
});

test('Tests that an open retry holds its dots for the minimum time when it fails at once', async () => {
  jest.useFakeTimers();
  const { app, loadExistingWalletOnBoot } = bootApp();
  app.state = {
    ...app.state,
    screen: RouteEnum.WalletError,
    walletError: {
      cause: { kind: 'connection' },
      step: { kind: 'open' },
      details: 'transport error',
    },
  };
  loadExistingWalletOnBoot.mockResolvedValue({
    kind: 'error',
    error: {
      cause: { kind: 'connection' },
      step: { kind: 'open' },
      details: 'transport error',
    },
  });

  const retried = app.retryWalletError();
  await jest.advanceTimersByTimeAsync(1_000);
  expect(app.state.retrying).toBe(true);
  await jest.advanceTimersByTimeAsync(400);
  await retried;

  expect(loadExistingWalletOnBoot).toHaveBeenCalledWith('skip');
  expect(app.state.retrying).toBe(false);
  expect(app.state.errorShake).toBe(1);
  jest.useRealTimers();
});

test('Tests that a create retry settles as soon as its loader returns', async () => {
  jest.useFakeTimers();
  const { app, createNewWallet } = bootApp();
  app.state = {
    ...app.state,
    screen: RouteEnum.WalletError,
    walletError: initError,
  };
  createNewWallet.mockResolvedValue({ kind: 'error', error: initError });

  await app.retryWalletError();

  expect(app.state.retrying).toBe(false);
  expect(app.state.errorShake).toBe(1);
  jest.useRealTimers();
});

test('Tests that the chain switch runs as an in-place retry', async () => {
  const { app, loadExistingWalletOnBoot } = bootApp();
  jest.spyOn(app, 'applyServer').mockResolvedValue(undefined);
  jest.spyOn(app, 'selectServerOnBoot').mockResolvedValue(true);

  await app.retry({ kind: 'switch', chain: ChainNameEnum.mainChainName });

  expect(loadExistingWalletOnBoot).toHaveBeenCalledWith('skip');
  expect(busy(app)).toEqual({ retrying: false, actionButtonsDisabled: false });
});

test('Tests that each retry kind runs its own step', async () => {
  const { app, loadExistingWalletOnBoot, createNewWallet, doRestore } =
    bootApp();

  await app.runRetry({ kind: 'open' });
  await app.runRetry({ kind: 'create' });
  await app.runRetry({
    kind: 'restore',
    seedUfvk: 'abandon',
    birthday: 7,
    origin: RouteEnum.ImportUfvk,
  });

  expect(loadExistingWalletOnBoot).toHaveBeenCalledTimes(1);
  expect(createNewWallet).toHaveBeenCalledTimes(1);
  expect(doRestore).toHaveBeenCalledWith('abandon', 7, RouteEnum.ImportUfvk);
});

test('Tests that the report action mails the subject the screen chose with the error text as the body', () => {
  const { app } = bootApp();
  app.state = { ...app.state, walletError: initError };

  app.onErrorAction({ kind: 'report', subject: 'subject' });

  expect(sendEmail).toHaveBeenCalledWith(
    expect.any(Function),
    '',
    'subject',
    'transport error',
  );
});
