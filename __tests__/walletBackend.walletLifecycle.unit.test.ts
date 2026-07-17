/**
 * WalletLifecycleService.restoreBackup must learn the restore outcome from
 * the native resolution instead of discarding it. Both bridges resolve the
 * failure shape — Android boolean false, iOS the string "false" — when the
 * restore fails, including when the backup content fails validation before
 * the swap (zingo-mobile#1151). A restoreBackup that ignores that shape
 * reports success to LoadedApp.onClickOKRestoreBackup, which then proceeds
 * as if the wallet had been swapped.
 */
jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '../app/RPCModule';
import { WalletLifecycleService } from '../app/walletBackend/modules/WalletLifecycleService';
import type { WalletBackendConfig } from '../app/walletBackend/config/WalletBackendConfig';
import type { SyncCoordinator } from '../app/walletBackend/modules/SyncCoordinator';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

// A service whose config translates by echoing the key, so an assertion can
// name the exact error the caller would surface, and whose coordinator only
// needs the pause seam the lifecycle methods await.
function makeService(): WalletLifecycleService {
  const config = {
    translate: jest.fn((key: string) => `translated:${key}`),
  } as unknown as WalletBackendConfig;
  const syncCoordinator = {
    pauseSyncProcess: jest.fn().mockResolvedValue(undefined),
  } as unknown as SyncCoordinator;
  return new WalletLifecycleService(config, syncCoordinator);
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('WalletLifecycleService.restoreBackup', () => {
  it('reports the native failure shapes as a translated error', async () => {
    const service = makeService();

    // The Android failure shape: the bridge resolves boolean false.
    bridge.walletBackupExists.mockResolvedValueOnce('true');
    bridge.walletExists.mockResolvedValueOnce('true');
    bridge.restoreExistingWalletBackup.mockResolvedValueOnce(false);
    await expect(service.restoreBackup()).resolves.toBe(
      'translated:rpc.restorebackupwallet-error',
    );

    // The iOS failure shape: the bridge resolves the string "false".
    bridge.walletBackupExists.mockResolvedValueOnce('true');
    bridge.walletExists.mockResolvedValueOnce('true');
    bridge.restoreExistingWalletBackup.mockResolvedValueOnce('false');
    await expect(service.restoreBackup()).resolves.toBe(
      'translated:rpc.restorebackupwallet-error',
    );
  });

  it('reports the native success shapes as the empty success string', async () => {
    const service = makeService();

    // The Android success shape: the bridge resolves boolean true.
    bridge.walletBackupExists.mockResolvedValueOnce('true');
    bridge.walletExists.mockResolvedValueOnce('true');
    bridge.restoreExistingWalletBackup.mockResolvedValueOnce(true);
    await expect(service.restoreBackup()).resolves.toBe('');

    // The iOS success shape: the bridge resolves the string "true".
    bridge.walletBackupExists.mockResolvedValueOnce('true');
    bridge.walletExists.mockResolvedValueOnce('true');
    bridge.restoreExistingWalletBackup.mockResolvedValueOnce('true');
    await expect(service.restoreBackup()).resolves.toBe('');
  });
});
