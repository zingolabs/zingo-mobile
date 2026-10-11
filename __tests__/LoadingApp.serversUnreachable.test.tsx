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
import { pickAutomatic } from '@app/services/serverPicking';
import mockNavigation from '../__mocks__/dataMocks/mockNavigation';

jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);
jest.mock('@app/services/serverPicking', () => ({
  ...jest.requireActual('@app/services/serverPicking'),
  pickAutomatic: jest.fn(),
}));

const ZAINO = 'https://mainnet.zainod.zingolabs.dev:443';

const bootApp = () => {
  const app = new LoadingAppClass({
    navigationApp: mockNavigation,
    route: { key: 'Key-1', name: RouteEnum.LoadingApp, params: undefined },
    translate: (key: string) => key,
    language: LanguageEnum.en,
    server: remoteServer(ZAINO, ChainNameEnum.mainChainName),
    privacy: false,
    backgroundSyncInfo: { batches: 0, message: '', date: 0, dateEnd: 0 },
    firstLaunchingMessage: LaunchingModeEnum.opening,
    biometrics: false,
    selectServer: SelectServerEnum.auto,
  } as never);
  app.state = {
    ...app.state,
    netInfo: { ...app.state.netInfo, isConnected: true },
  };
  // setState applies at once, as the boot reads the result right after.
  app.setState = ((update: any) => {
    const next = typeof update === 'function' ? update(app.state) : update;
    app.state = { ...app.state, ...next };
  }) as never;
  return app;
};

afterEach(() => jest.clearAllMocks());

test('Tests that a boot where no server answers marks the network as unreachable', async () => {
  (pickAutomatic as jest.Mock).mockResolvedValue({
    server: { uri: ZAINO, chainName: ChainNameEnum.mainChainName },
    tier: 'default',
  });
  const app = bootApp();

  await app.selectServerOnBoot(true);

  expect(app.state.netInfo.serversUnreachable).toBe(true);
});

test('Tests that a boot where a server answers leaves the network reachable', async () => {
  (pickAutomatic as jest.Mock).mockResolvedValue({
    server: { uri: ZAINO, chainName: ChainNameEnum.mainChainName },
    tier: 'recommended',
  });
  const app = bootApp();

  await app.selectServerOnBoot(true);

  expect(app.state.netInfo.serversUnreachable).toBe(false);
});
