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
import { createAlert } from '@app/services/createAlert';
import { sendEmail } from '@app/services/sendEmail';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/services/createAlert', () => ({ createAlert: jest.fn() }));
jest.mock('@app/services/sendEmail', () => ({ sendEmail: jest.fn() }));

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
  const showError = jest.spyOn(app, 'showError').mockImplementation(() => {});
  const loadExistingWalletOnBoot = jest
    .spyOn(app, 'loadExistingWalletOnBoot')
    .mockResolvedValue(undefined);
  const createNewWallet = jest
    .spyOn(app, 'createNewWallet')
    .mockResolvedValue(undefined);
  const doRestore = jest.spyOn(app, 'doRestore').mockResolvedValue(undefined);
  return {
    app,
    showError,
    loadExistingWalletOnBoot,
    createNewWallet,
    doRestore,
  };
};

beforeEach(() => jest.clearAllMocks());

test('Tests that a create failing on the connection lands on the error screen with its step kept', () => {
  const { app, showError } = bootApp();

  app.initFailed(
    { kind: 'create' },
    'grpc connect to https://testnet.example:443 failed: transport error',
  );

  expect(showError).toHaveBeenCalledWith({
    kind: 'init',
    details:
      'grpc connect to https://testnet.example:443 failed: transport error',
    step: { kind: 'create' },
  });
  expect(createAlert).not.toHaveBeenCalled();
});

test('Tests that a restore failing on anything but the connection keeps the alert with its report button', () => {
  const { app, showError } = bootApp();

  app.initFailed(
    {
      kind: 'restore',
      seedUfvk: 'abandon',
      birthday: 0,
      origin: RouteEnum.ImportUfvk,
    },
    'invalid seed phrase checksum',
  );

  expect(showError).not.toHaveBeenCalled();
  expect(createAlert).toHaveBeenCalledWith(
    expect.any(Function),
    expect.any(Function),
    'loadingapp.readingwallet-label',
    'invalid seed phrase checksum',
    false,
    expect.any(Function),
    expect.any(Function),
    '',
  );
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
  app.state = {
    ...app.state,
    walletError: {
      kind: 'init',
      details: 'transport error',
      step: { kind: 'create' },
    },
  };

  app.onErrorAction({ kind: 'report', subject: 'subject' });

  expect(sendEmail).toHaveBeenCalledWith(
    expect.any(Function),
    '',
    'subject',
    'transport error',
  );
});
