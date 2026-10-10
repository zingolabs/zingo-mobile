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
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

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
const appWithSaved = (birthday: number) => {
  const app = new LoadingAppClass({
    navigationApp: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.LoadingApp, params: undefined },
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
    recoveryWallet: { seed: 'abandon ability able', birthday },
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

  await app.importRecoveryWallet();

  expect(doRestore).not.toHaveBeenCalled();
  expect(confirms[0].title).toBe('loadingapp.saved-wallet-net-title');
});

test('Tests that a saved phrase born before the network tip restores', async () => {
  const { app, doRestore } = appWithSaved(2900000);

  await app.importRecoveryWallet();

  expect(doRestore).toHaveBeenCalledWith(
    'abandon ability able',
    2900000,
    expect.anything(),
  );
});
