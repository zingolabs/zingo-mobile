jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import WalletBackend from '@app/walletBackend/WalletBackend';
import { SyncCoordinator } from '@app/walletBackend/modules/SyncCoordinator';
import { ChainNameEnum, remoteServer } from '@app/AppState';
import { mockServer } from '../__mocks__/dataMocks/mockServer';
import { mockWalletBackendConfig } from '../__mocks__/dataMocks/mockWalletBackendConfig';

test('Tests that setServer moves the coordinator past every read begun on the old server', () => {
  const config = mockWalletBackendConfig({ server: mockServer });
  const backend = new WalletBackend(config);
  const coordinator = (
    backend as unknown as { syncCoordinator: SyncCoordinator }
  ).syncCoordinator;
  const before = coordinator.controllerEpoch;
  const next = remoteServer(
    'https://other.example:443',
    ChainNameEnum.mainChainName,
  );

  backend.setServer(next);

  expect(coordinator.controllerEpoch).toBe(before + 1);
  expect(config.server).toEqual(next);
});
