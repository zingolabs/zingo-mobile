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
import RPCModule from '@app/RPCModule';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@app/services/gateController', () => ({
  ...jest.requireActual('@app/services/gateController'),
  resolveTriggerGate: jest.fn(async () => ({ kind: 'passed' })),
}));

jest.mock('@app/services/recoveryWalletInfo', () => ({
  ...jest.requireActual('@app/services/recoveryWalletInfo'),
  hasRecoveryWalletInfo: jest.fn(async () => false),
  getRecoveryWalletInfo: jest.fn(async () => null),
}));

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

// A testnet server and a wallet file on disk; the boot runs without
// rendering, so the decisions are read from the calls it makes.
const bootApp = (selectServer: SelectServerEnum) => {
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
    selectServer,
  } as never);
  const applyServer = jest
    .spyOn(app, 'applyServer')
    .mockResolvedValue(undefined);
  jest.spyOn(app, 'selectServerOnBoot').mockResolvedValue(true);
  const showChainError = jest.spyOn(app, 'showChainError');
  return { app, applyServer, showChainError };
};

describe('A wallet on another network than its server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bridge.walletExists.mockResolvedValue('true');
  });

  test('moves Automatic to the wallet network', async () => {
    bridge.walletChainInfo.mockResolvedValue('main');
    const { app, applyServer } = bootApp(SelectServerEnum.auto);

    await app.componentDidMount();

    expect(applyServer).toHaveBeenCalledWith(
      expect.objectContaining({ chainName: ChainNameEnum.mainChainName }),
      SelectServerEnum.auto,
    );
  });

  test('keeps a server the user chose and offers one instead of opening', async () => {
    bridge.walletChainInfo.mockResolvedValue('main');
    const { app, applyServer, showChainError } = bootApp(
      SelectServerEnum.custom,
    );

    await app.componentDidMount();

    expect(applyServer).not.toHaveBeenCalled();
    expect(showChainError).toHaveBeenCalledWith(
      ChainNameEnum.mainChainName,
      expect.any(String),
    );
    expect(bridge.loadExistingWallet).not.toHaveBeenCalled();
  });

  test('turns a typed mismatch from the open into the same offer', async () => {
    bridge.walletChainInfo
      .mockResolvedValueOnce('test')
      .mockResolvedValue('main');
    bridge.loadExistingWallet.mockRejectedValue(
      Object.assign(new Error('wallet chain name mainnet'), {
        code: 'WalletChainMismatch',
      }),
    );
    const { app, showChainError } = bootApp(SelectServerEnum.custom);

    await app.loadExistingWalletOnBoot();

    expect(showChainError).toHaveBeenCalledWith(
      ChainNameEnum.mainChainName,
      expect.stringContaining('wallet chain name mainnet'),
    );
  });
});
