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
import { askGate, resolveTriggerGate } from '@app/services/gateController';
import RPCModule from '@app/RPCModule';
import { hasRecoveryWalletInfo } from '@app/services/recoveryWalletInfo';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  resolveTriggerGate: jest.fn(async () => ({ kind: 'passed' })),
  askGate: jest.fn(async () => ({ kind: 'passed' })),
}));

jest.mock('@app/services/recoveryWalletInfo', () => ({
  ...jest.requireActual('@app/services/recoveryWalletInfo'),
  hasRecoveryWalletInfo: jest.fn(async () => false),
  getRecoveryWalletInfo: jest.fn(async () => null),
}));

const walletExists = RPCModule.walletExists as unknown as jest.Mock;
const hasRecovery = hasRecoveryWalletInfo as jest.Mock;

// The boot logic is what is under test, not the Welcome it draws, so the
// class is built and its mount handler called without rendering. A custom
// server keeps the boot off the network.
const bootApp = () =>
  new LoadingAppClass({
    session: { kind: 'boot', startingApp: true, newWallet: false },
    openWallet: jest.fn(),
    openOnboarding: jest.fn(),
    openBoot: jest.fn(),
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
// New Wallet on the Welcome. The recovery info stored on the device is
// gated where it is used, when it is viewed or imported.
describe('LoadingApp start gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('is not asked on a device with no wallet, even with recovery info stored', async () => {
    walletExists.mockResolvedValue('false');
    hasRecovery.mockResolvedValue(true);

    await bootApp().componentDidMount();

    expect(walletExists).toHaveBeenCalled();
    expect(resolveTriggerGate).not.toHaveBeenCalled();
  });

  test('is asked when the stored recovery info is imported, and a decline does not restore', async () => {
    walletExists.mockResolvedValue('false');
    hasRecovery.mockResolvedValue(false);
    const app = bootApp();
    app.state = {
      ...app.state,
      recoveryWallet: {
        seed: 'abandon '.repeat(24).trim(),
        ufvk: '',
        birthday: 1,
      },
    };
    const restore = jest.spyOn(app, 'doRestore').mockResolvedValue(undefined);
    (askGate as jest.Mock).mockResolvedValueOnce({
      kind: 'declined',
      failure: { errorKey: 'biometrics-failure-declined' },
    });

    await app.importRecoveryWallet(RouteEnum.Welcome);

    expect(askGate).toHaveBeenCalledTimes(1);
    expect(restore).not.toHaveBeenCalled();

    await app.importRecoveryWallet(RouteEnum.Welcome);

    expect(restore).toHaveBeenCalledTimes(1);
  });

  test('is still asked when a wallet exists, and a decline stops the boot', async () => {
    walletExists.mockResolvedValue('true');
    hasRecovery.mockResolvedValue(false);
    (resolveTriggerGate as jest.Mock).mockResolvedValueOnce({
      kind: 'declined',
      failure: { errorKey: 'biometrics-failure-declined' },
    });

    await bootApp().componentDidMount();

    expect(resolveTriggerGate).toHaveBeenCalledTimes(1);
    expect(RPCModule.loadExistingWallet).not.toHaveBeenCalled();
  });
});
