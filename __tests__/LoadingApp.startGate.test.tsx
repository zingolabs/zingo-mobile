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
import { resolveTriggerGate } from '@app/services/gateController';
import RPCModule from '@app/RPCModule';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  resolveTriggerGate: jest.fn(async () => ({ kind: 'passed' })),
}));

const walletExists = RPCModule.walletExists as unknown as jest.Mock;

// The boot logic is what is under test, not the Welcome it draws, so the
// class is built and its mount handler called without rendering. A custom
// server keeps the boot off the network.
const bootApp = () =>
  new LoadingAppClass({
    navigationApp: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.LoadingApp, params: undefined },
    translate: (key: string) => key,
    language: LanguageEnum.en,
    server: remoteServer(
      'https://example.test:443',
      ChainNameEnum.mainChainName,
    ),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometrics: true,
    selectServer: SelectServerEnum.custom,
  } as never);

// The start gate guards the wallet file. On a device without one there is
// nothing behind it, and asking only put the fail-open notice over Create
// New Wallet on the Welcome.
describe('LoadingApp start gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('is not asked on a device with no wallet', async () => {
    walletExists.mockResolvedValue('false');

    await bootApp().componentDidMount();

    expect(walletExists).toHaveBeenCalled();
    expect(resolveTriggerGate).not.toHaveBeenCalled();
  });

  test('is still asked when a wallet exists, and a decline stops the boot', async () => {
    walletExists.mockResolvedValue('true');
    (resolveTriggerGate as jest.Mock).mockResolvedValueOnce({
      kind: 'declined',
      failure: { errorKey: 'biometrics-failure-declined' },
    });

    await bootApp().componentDidMount();

    expect(resolveTriggerGate).toHaveBeenCalledTimes(1);
    expect(RPCModule.loadExistingWallet).not.toHaveBeenCalled();
  });
});
