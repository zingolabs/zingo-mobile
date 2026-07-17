/**
 * Offline must be survivable. Every routed getter rejects typed when the
 * device has no network, and DataService's polling methods run on a
 * five-second cadence — so a rejection that merely means "offline" must
 * not tear down and reconfigure the sync coordinator on every tick, and
 * the local value-transfer history must still render without a server.
 *
 * These tests pin the decoding contract: DataService decodes the
 * ZingolibError variant from a bridge rejection and restarts sync only
 * for the variants that signal a broken client (a poisoned lock, a
 * missing client, a panic), never for the transient read family.
 */
jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '../app/RPCModule';
import { DataService } from '../app/walletBackend/modules/DataService';
import {
  ZingolibErrorVariant,
  decodeZingolibErrorVariant,
} from '../app/walletBackend/utils/zingolibRejection';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

// The two shapes a typed ZingolibError rejection wears by the time React
// Native hands it to JS. Android surfaces the Rust Display rendering
// verbatim as the exception message; iOS surfaces String(describing:) of
// the Swift enum case wrapping that same rendering. The code property
// carries the FFI's name on both platforms.
function androidRejection(ffi: string, display: string): Error {
  return Object.assign(new Error(display), { code: ffi });
}
function iosRejection(ffi: string, variant: string, display: string): Error {
  return Object.assign(new Error(`${variant}(message: "${display}")`), {
    code: ffi,
  });
}

// The Read variant's Display for a failed server dial — the rejection an
// offline device produces on every polling tick.
const offlineDisplay = 'Error: read: transport error: connection refused';

function makeDataService() {
  const onError = jest.fn();
  const onSyncError = jest.fn();
  const onValueTransfersChanged = jest.fn();
  const config = {
    onError,
    onValueTransfersChanged,
    onBalanceChanged: jest.fn(),
    server: { uri: 'https://server.example' },
  } as unknown as ConstructorParameters<typeof DataService>[0];
  const dataService = new DataService(config);
  dataService.onSyncError = onSyncError;
  return { dataService, onError, onSyncError, onValueTransfersChanged };
}

describe('an offline rejection is transient: no sync-coordinator restart', () => {
  it.each([
    [
      'Android shape',
      androidRejection('get_latest_block_server', offlineDisplay),
    ],
    [
      'iOS shape',
      iosRejection('get_latest_block_server', 'Read', offlineDisplay),
    ],
  ])('%s', async (_shape, rejection) => {
    const { dataService, onSyncError, onValueTransfersChanged } =
      makeDataService();
    bridge.getLatestBlockServerInfo.mockRejectedValueOnce(rejection);
    bridge.getValueTransfersList.mockResolvedValueOnce(
      '{"value_transfers":[]}',
    );

    await dataService.fetchTandZandOValueTransfers();

    // Both halves of the contract: the coordinator is left alone, and the
    // local history — a wallet read that needs no server — still renders.
    expect(onSyncError).not.toHaveBeenCalled();
    expect(onValueTransfersChanged).toHaveBeenCalledWith([], 0);
  });
});

describe('a broken-client rejection still restarts the sync coordinator', () => {
  it.each([
    [
      'a poisoned lock, Android shape',
      androidRejection('get_balance', 'Error: Lightclient lock poisoned'),
    ],
    [
      'a missing client, iOS shape',
      iosRejection(
        'get_balance',
        'LightclientNotInitialized',
        'Error: Lightclient is not initialized',
      ),
    ],
    // A rejection no decoder recognizes keeps the conservative default.
    ['an undecodable rejection', new Error('bridge exploded')],
  ])('%s', async (_case, rejection) => {
    const { dataService, onError, onSyncError } = makeDataService();
    bridge.getSpendableBalanceTotalInfo.mockRejectedValueOnce(rejection);

    await dataService.fetchTotalBalance();

    expect(onSyncError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('Error'));
  });
});

describe('the decoder recovers every variant from both platform shapes', () => {
  // Each variant with its Rust Display rendering, verbatim from the
  // #[error(...)] attributes in rust/lib/src/lib.rs.
  const variants: Array<[ZingolibErrorVariant, string]> = [
    [
      ZingolibErrorVariant.LightclientNotInitialized,
      'Error: Lightclient is not initialized',
    ],
    [
      ZingolibErrorVariant.LightclientLockPoisoned,
      'Error: Lightclient lock poisoned',
    ],
    [ZingolibErrorVariant.Panic, 'Error: panic: boom'],
    [ZingolibErrorVariant.Save, 'Error: saving wallet: disk full'],
    [ZingolibErrorVariant.Init, 'Error: initializing wallet: bad seed'],
    [ZingolibErrorVariant.Sync, 'Error: sync: server hung up'],
    [ZingolibErrorVariant.Rescan, 'Error: rescan: server hung up'],
    [ZingolibErrorVariant.Read, offlineDisplay],
    [
      ZingolibErrorVariant.Drain,
      'Error: draining orchard to ironwood: sync already running',
    ],
  ];

  it.each(variants)('%s, Android shape', (variant, display) => {
    expect(decodeZingolibErrorVariant(androidRejection('any', display))).toBe(
      variant,
    );
  });

  it.each(variants)('%s, iOS shape', (variant, display) => {
    expect(
      decodeZingolibErrorVariant(iosRejection('any', variant, display)),
    ).toBe(variant);
  });

  it.each([
    ['prose no variant emits', new Error('bridge exploded')],
    ['a Swift case outside the enum', new Error('FileError(message: "gone")')],
    ['a non-Error rejection', 42],
  ])('%s decodes to Unknown', (_case, rejection) => {
    expect(decodeZingolibErrorVariant(rejection)).toBe(
      ZingolibErrorVariant.Unknown,
    );
  });
});
