/**
 * @format
 */

import 'react-native';

import { LoadingAppClass } from '@app/LoadingApp';
import {
  ChainNameEnum,
  LanguageEnum,
  LaunchingModeEnum,
  Route,
  SelectServerEnum,
} from '@app/AppState';
import { remoteServer } from '@app/AppState/types/ServerType';
import RPCModule from '@app/RPCModule';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

const SEED =
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon abandon ' +
  'abandon abandon abandon abandon abandon abandon abandon art';

const rejection = (code: string) =>
  Object.assign(new Error('the message'), { code });

const app = () => {
  const loading = new LoadingAppClass({
    session: { kind: 'boot', startingApp: true, newWallet: false },
    translate: (key: string) => key,
    language: LanguageEnum.en,
    server: remoteServer(
      'https://mainnet.example:443',
      ChainNameEnum.mainChainName,
    ),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometrics: false,
    selectServer: SelectServerEnum.auto,
  } as never);
  jest.spyOn(loading, 'setState').mockImplementation(() => {});
  const shown = jest
    .spyOn(loading, 'showWalletError')
    .mockImplementation(() => {});
  return { loading, shown };
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

test.each([
  ['InitServer', 'server'],
  ['InitKey', 'key'],
  ['Init', 'unknown'],
])(
  'Tests that a restore and a create name the same cause when both get %s',
  async (code, cause) => {
    const restoring = app();
    jest
      .mocked(RPCModule.restoreWalletFromSeed)
      .mockRejectedValue(rejection(code));
    await restoring.loading.doRestore(SEED, 0);
    expect(restoring.shown).toHaveBeenCalledWith(
      'restore',
      cause,
      'the message',
    );

    const creating = app();
    jest.mocked(RPCModule.createNewWallet).mockRejectedValue(rejection(code));
    await creating.loading.createNewWallet();
    expect(creating.shown).toHaveBeenCalledWith('create', cause, 'the message');
  },
);

test('Tests that the cause ignores the text when the message names the connection', async () => {
  const { loading, shown } = app();
  jest.mocked(RPCModule.restoreWalletFromSeed).mockRejectedValue(
    Object.assign(new Error('grpc transport connection timed out'), {
      code: 'Init',
    }),
  );
  await loading.doRestore(SEED, 0);
  expect(shown.mock.calls[0][1]).toBe('unknown');
});

test('Tests that a key known to be wrong never reaches zingolib when it is restored', async () => {
  const { loading, shown } = app();
  await loading.doRestore('abandon ability able', 0);
  await loading.doRestore('uviewtest1qqqq', 0);
  expect(RPCModule.restoreWalletFromSeed).not.toHaveBeenCalled();
  expect(RPCModule.restoreWalletFromUfvk).not.toHaveBeenCalled();
  expect(shown.mock.calls.map(call => call[1])).toEqual(['key', 'key']);
});

test('Tests that a create is not stopped when the device reports no network', async () => {
  const { loading } = app();
  loading.state = {
    ...loading.state,
    netInfo: { ...loading.state.netInfo, isConnected: false },
  };
  jest.mocked(RPCModule.createNewWallet).mockRejectedValue(rejection('Init'));
  await loading.createNewWallet();
  expect(RPCModule.createNewWallet).toHaveBeenCalledTimes(1);
});

test('Tests that a retry reruns the failed restore when the error screen asks for it', async () => {
  const { loading } = app();
  const restore = jest.mocked(RPCModule.restoreWalletFromSeed);
  restore.mockRejectedValue(rejection('Init'));
  await loading.doRestore(SEED, 2000000);
  await loading.retryWalletLoad();
  expect(restore).toHaveBeenCalledTimes(2);
  expect(restore.mock.calls[1]).toEqual(restore.mock.calls[0]);
});

test('Tests that the key is forgotten when the user goes back from the error screen', async () => {
  const { loading } = app();
  const restore = jest.mocked(RPCModule.restoreWalletFromSeed);
  restore.mockRejectedValue(rejection('Init'));
  await loading.doRestore(SEED, 2000000, Route.ImportChooser);
  expect(loading.failedLoad.origin).toBe(Route.ImportChooser);
  loading.leaveWalletError();
  expect(loading.failedLoad.origin).toBe(Route.Welcome);
  const open = jest
    .spyOn(loading, 'loadExistingWalletOnBoot')
    .mockResolvedValue(undefined);
  await loading.retryWalletLoad();
  expect(open).toHaveBeenCalledTimes(1);
  expect(restore).toHaveBeenCalledTimes(1);
});
