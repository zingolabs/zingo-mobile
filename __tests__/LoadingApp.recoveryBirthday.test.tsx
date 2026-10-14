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
import {
  ConfirmOptions,
  registerConfirmListener,
} from '@app/services/showConfirm';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  askGate: jest.fn(async () => ({ kind: 'passed' })),
}));
jest.mock('@app/services/serverPicking', () => ({
  ...jest.requireActual('@app/services/serverPicking'),
  probeUri: jest.fn(async () => ({ latency: 40, height: '3000000' })),
}));

// A mainnet server whose tip is block 3,000,000, and a phrase saved on the
// device with the given birthday.
const appWithSaved = (
  birthday: number,
  saved: { seed?: string; ufvk?: string } = { seed: 'abandon ability able' },
) => {
  const app = new LoadingAppClass({
    session: { kind: 'boot', startingApp: true, newWallet: false },
    openWallet: jest.fn(),
    openOnboarding: jest.fn(),
    openBoot: jest.fn(),
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
  app.state = {
    ...app.state,
    netInfo: { ...app.state.netInfo, isConnected: true },
    recoveryWallet: { ...saved, birthday },
  };
  const doRestore = jest.spyOn(app, 'doRestore').mockResolvedValue(undefined);
  return { app, doRestore };
};

afterEach(() => {
  jest.clearAllMocks();
  registerConfirmListener(null);
});

test('Tests that a saved phrase born past the network tip warns instead of restoring', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  const { app, doRestore } = appWithSaved(3700000);

  await app.importRecoveryWallet(RouteEnum.Welcome);

  expect(doRestore).not.toHaveBeenCalled();
  expect(confirms[0].title).toBe('loadingapp.saved-wallet-net-title');
});

test('Tests that a saved phrase born before the network tip restores', async () => {
  const { app, doRestore } = appWithSaved(2900000);

  await app.importRecoveryWallet(RouteEnum.Welcome);

  expect(doRestore).toHaveBeenCalledWith(
    'abandon ability able',
    2900000,
    expect.anything(),
  );
});

test('Tests that a saved viewing key of another network offers a server of its network instead of restoring', async () => {
  const confirms: ConfirmOptions[] = [];
  registerConfirmListener(options => confirms.push(options));
  const { app, doRestore } = appWithSaved(2900000, { ufvk: 'uviewtest1qqqq' });
  const openServer = jest.spyOn(app, 'openServer').mockImplementation(() => {});

  await app.importRecoveryWallet(RouteEnum.Welcome);

  expect(doRestore).not.toHaveBeenCalled();
  expect(confirms[0].message).toBe('loadingapp.saved-key-net-body');
  confirms[0].buttons[0].onPress?.();
  expect(openServer).toHaveBeenCalledWith(ChainNameEnum.testChainName);
});

test('Tests that a saved viewing key of the server network restores', async () => {
  const { app, doRestore } = appWithSaved(2900000, { ufvk: 'uview1qqqq' });

  await app.importRecoveryWallet(RouteEnum.Welcome);

  expect(doRestore).toHaveBeenCalledWith(
    'uview1qqqq',
    2900000,
    expect.anything(),
  );
});
