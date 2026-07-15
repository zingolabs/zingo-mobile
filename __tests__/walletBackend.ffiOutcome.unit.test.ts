/**
 * The TypeScript quarter of the per-FFI outcome contract
 * (zingo-mobile#1151): the native bridges reject on failure, so the TS
 * layer learns outcomes from the promise channel — resolutions pass
 * through unclassified, and rejections are contained by the owning
 * try/catch, never re-derived by sniffing content.
 *
 * These are the TS twins of the Rust init_error_channel_tests, the
 * Kotlin FfiOutcomeTest, and the Swift FfiOutcomeTests.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
jest.mock('../app/RPCModule', () => {
  const members: Record<PropertyKey, jest.Mock> = {};
  return {
    __esModule: true,
    default: new Proxy(members, {
      get: (target, prop) => (target[prop] ??= jest.fn()),
    }),
  };
});

import RPCModule from '../app/RPCModule';
import {
  createNewWallet,
  loadExistingWallet,
  restoreWalletFromSeed,
  restoreWalletFromUfvk,
} from '../app/walletBackend/utils/walletUtils';
import { SyncCoordinator } from '../app/walletBackend/modules/SyncCoordinator';
import { DataService } from '../app/walletBackend/modules/DataService';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

// A resolution that wears the historical error sentinel: it must pass
// through every wrapper verbatim, never classified as a failure.
const proseLikeData = 'Error: looks like prose but is legitimate data';

describe('init family wrappers pass resolutions through and contain rejections', () => {
  const wrappers: Array<[string, string, () => Promise<string>]> = [
    [
      'init_new',
      'createNewWallet',
      () => createNewWallet('uri', 'main', 'Medium', '1'),
    ],
    [
      'init_from_seed',
      'restoreWalletFromSeed',
      () => restoreWalletFromSeed('seed', '1', 'uri', 'main', 'Medium', '1'),
    ],
    [
      'init_from_ufvk',
      'restoreWalletFromUfvk',
      () => restoreWalletFromUfvk('ufvk', '1', 'uri', 'main', 'Medium', '1'),
    ],
    [
      'init_from_b64',
      'loadExistingWallet',
      () => loadExistingWallet('uri', 'main', 'Medium', '1'),
    ],
  ];

  it.each(wrappers)('%s', async (_ffi, bridgeMethod, call) => {
    bridge[bridgeMethod].mockResolvedValueOnce(proseLikeData);
    await expect(call()).resolves.toBe(proseLikeData);

    bridge[bridgeMethod].mockRejectedValueOnce(new Error('bridge exploded'));
    const contained = await call();
    expect(contained).toMatch(/^Error: /);
  });
});

describe('sync family rejections are contained and reported, never sniffed', () => {
  function makeCoordinator() {
    const onError = jest.fn();
    const config = {
      onError,
      keepAwake: jest.fn(),
      onSyncStatusChanged: jest.fn(),
      onBalanceChanged: jest.fn(),
    } as unknown as ConstructorParameters<typeof SyncCoordinator>[0];
    const dataService = {} as ConstructorParameters<typeof SyncCoordinator>[1];
    return { coordinator: new SyncCoordinator(config, dataService), onError };
  }

  it('run_sync', async () => {
    const { coordinator, onError } = makeCoordinator();
    bridge.runSyncProcess.mockRejectedValueOnce(new Error('bridge exploded'));

    await coordinator.refreshSync();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync/rescan run'),
    );
  });

  it('run_rescan', async () => {
    const { coordinator, onError } = makeCoordinator();
    bridge.runRescanProcess.mockRejectedValueOnce(new Error('bridge exploded'));

    await coordinator.refreshSync(true);

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync/rescan run'),
    );
  });

  it('pause_sync', async () => {
    const { coordinator, onError } = makeCoordinator();
    bridge.pauseSyncProcess.mockRejectedValueOnce(new Error('bridge exploded'));

    await coordinator.pauseSyncProcess();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync pause'),
    );
  });

  it('status_sync', async () => {
    const { coordinator, onError } = makeCoordinator();
    bridge.statusSyncInfo.mockRejectedValueOnce(new Error('bridge exploded'));

    await coordinator.fetchSyncStatus();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync status'),
    );
  });

  it('poll_sync', async () => {
    const { coordinator, onError } = makeCoordinator();
    bridge.pollSyncInfo.mockRejectedValueOnce(new Error('bridge exploded'));

    await coordinator.fetchSyncPoll();

    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Error sync poll'),
    );
  });
});

describe('read getter rejections are contained and reported, never sniffed', () => {
  function makeDataService() {
    const onError = jest.fn();
    const config = {
      onError,
      onAddressesChanged: jest.fn(),
      onZingolibVersionChanged: jest.fn(),
    } as unknown as ConstructorParameters<typeof DataService>[0];
    return { dataService: new DataService(config), onError };
  }

  const rejection = () => Promise.reject(new Error('bridge exploded'));

  const fetches: Array<
    [string, string, (dataService: DataService) => Promise<unknown>]
  > = [
    [
      'get_latest_block_wallet',
      'getLatestBlockWalletInfo',
      ds => ds.fetchWalletHeight(),
    ],
    ['get_version', 'getVersionInfo', ds => ds.fetchZingolibVersion()],
    [
      'get_unified_addresses',
      'getUnifiedAddressesInfo',
      ds => ds.fetchAddresses(),
    ],
    [
      'get_wallet_save_required',
      'getWalletSaveRequiredInfo',
      ds => ds.getWalletSaveRequired(),
    ],
    [
      'get_config_wallet_performance',
      'getConfigWalletPerformanceInfo',
      ds => ds.getConfigWalletPerformance(),
    ],
    ['get_wallet_version', 'getWalletVersionInfo', ds => ds.getWalletVersion()],
  ];

  it.each(fetches)('%s', async (_ffi, bridgeMethod, call) => {
    const { dataService, onError } = makeDataService();
    bridge[bridgeMethod].mockImplementationOnce(rejection);

    await call(dataService);

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });

  it('get_transparent_addresses', async () => {
    // fetchAddresses awaits the unified getter first; resolve it so the
    // rejection under test is the transparent one.
    const { dataService, onError } = makeDataService();
    bridge.getUnifiedAddressesInfo.mockResolvedValueOnce('[]');
    bridge.getTransparentAddressesInfo.mockImplementationOnce(rejection);

    await dataService.fetchAddresses();

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });

  it('a resolved value wearing the error sentinel is data, not a failure', async () => {
    // The attack case for the read path: after the sniff deletion the
    // value goes to JSON.parse, and this valid JSON must land in the
    // changed-callback, not in onError.
    const { dataService, onError } = makeDataService();
    const config = dataService.config as unknown as {
      onZingolibVersionChanged: jest.Mock;
    };
    bridge.getVersionInfo.mockResolvedValueOnce('error-1.2.3');

    await dataService.fetchZingolibVersion();

    expect(onError).not.toHaveBeenCalled();
    expect(config.onZingolibVersionChanged).toHaveBeenCalledWith('error-1.2.3');
  });
});
