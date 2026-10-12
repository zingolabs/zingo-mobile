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
import { NetInfoStateType } from '@react-native-community/netinfo/src/index';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(async () => ({
    isConnected: true,
    isInternetReachable: false,
    type: 'wifi',
    details: { isConnectionExpensive: false },
  })),
  addEventListener: jest.fn(() => jest.fn()),
}));

jest.mock('@app/services/recoveryWalletInfo', () => ({
  ...jest.requireActual('@app/services/recoveryWalletInfo'),
  hasRecoveryWalletInfo: jest.fn(async () => false),
  getRecoveryWalletInfo: jest.fn(async () => null),
}));

const walletExists = RPCModule.walletExists as unknown as jest.Mock;
const createNewWallet = RPCModule.createNewWallet as unknown as jest.Mock;

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

describe('LoadingApp create gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Tests that the boot keeps the internet reachability netinfo reported', async () => {
    walletExists.mockResolvedValue('false');

    const app = bootApp();
    await app.componentDidMount();

    expect(app.state.netInfo.isInternetReachable).toBe(false);
  });

  test('Tests that creation refuses to dial when netinfo reported no internet', async () => {
    const app = bootApp();
    app.state = {
      ...app.state,
      netInfo: {
        isConnected: true,
        type: NetInfoStateType.wifi,
        isConnectionExpensive: false,
        isInternetReachable: false,
      },
    };

    await app.createNewWallet();

    expect(createNewWallet).not.toHaveBeenCalled();
  });
});
