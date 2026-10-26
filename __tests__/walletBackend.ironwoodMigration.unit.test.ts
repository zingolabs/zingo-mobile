/**
 * The wrappers that cancel an old private migration at launch share one
 * typed FFI contract, so one table exercises them all:
 *   - a resolution passes through verbatim as { ok: true }, even when it
 *     wears the historical error sentinel (data is never sniffed);
 *   - a rejection whose `.code` is a ZingolibError variant name maps to
 *     { ok: false } with that code;
 *   - a rejection without a recognized code maps to code 'Unknown'.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '@app/RPCModule';
import { FfiResult } from '@app/walletBackend/ffi';
import {
  cancelIronwoodMigration,
  cancelOldPrivateMigration,
  migrationStatus,
  reconcileMigration,
} from '@app/walletBackend/utils/walletUtils';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

// The widened signature through which a case's untyped callArgs are applied.
type CallableWrapper = (...args: unknown[]) => Promise<FfiResult<string>>;

// Each case names only the wrapper and its arguments. The bridge method
// (`${wrapper.name}Process`) is derived, so each wrapper's identity is
// written exactly once — in the code under test.
type WrapperCase = {
  wrapper: (...args: never[]) => Promise<FfiResult<string>>;
  callArgs: unknown[];
  expectedBridgeArgs: string[];
};

const wrapperCases: WrapperCase[] = [
  { wrapper: migrationStatus, callArgs: [], expectedBridgeArgs: [] },
  { wrapper: reconcileMigration, callArgs: [], expectedBridgeArgs: [] },
  { wrapper: cancelIronwoodMigration, callArgs: [], expectedBridgeArgs: [] },
];

describe('the private-migration cancel wrappers share one typed FFI contract', () => {
  it.each(wrapperCases)(
    '$wrapper.name',
    async ({ wrapper, callArgs, expectedBridgeArgs }) => {
      const bridgeMethod = bridge[`${wrapper.name}Process`];
      const callWrapper = () => (wrapper as CallableWrapper)(...callArgs);

      // Passthrough is unconditional: a resolution wearing the historical
      // error sentinel is data like any other, never re-classified.
      const passthroughResolutions = [
        '{ "started": true }',
        'Error: ConsentStale',
      ];
      for (const resolution of passthroughResolutions) {
        bridgeMethod.mockResolvedValueOnce(resolution);
        await expect(callWrapper()).resolves.toEqual({
          ok: true,
          value: resolution,
        });
        expect(bridgeMethod).toHaveBeenLastCalledWith(...expectedBridgeArgs);
      }

      // A rejection whose `.code` is a ZingolibError variant name surfaces
      // as that typed code with the bridge's human message.
      bridgeMethod.mockRejectedValueOnce(
        Object.assign(new Error('Error: consent stale: notes changed'), {
          code: 'MigrationConsentStale',
        }),
      );
      await expect(callWrapper()).resolves.toEqual({
        ok: false,
        error: {
          code: 'MigrationConsentStale',
          message: 'Error: consent stale: notes changed',
        },
      });

      // A rejection without a recognized code maps to 'Unknown', never
      // escapes as a thrown error.
      bridgeMethod.mockRejectedValueOnce(new Error('bridge exploded'));
      await expect(callWrapper()).resolves.toEqual({
        ok: false,
        error: { code: 'Unknown', message: 'bridge exploded' },
      });
    },
  );
});

describe('cancelOldPrivateMigration', () => {
  const statusWith = (phase: object | null) =>
    bridge.migrationStatusProcess.mockResolvedValue(JSON.stringify({ phase }));

  beforeEach(() => {
    jest.clearAllMocks();
    bridge.reconcileMigrationProcess.mockResolvedValue('{}');
    bridge.cancelIronwoodMigrationProcess.mockResolvedValue(
      '{ "cancelled": true }',
    );
  });

  test('Tests that a migration left in flight is recorded, then cancelled', async () => {
    statusWith({ kind: 'parts_scheduled' });

    await cancelOldPrivateMigration();

    expect(bridge.reconcileMigrationProcess).toHaveBeenCalled();
    expect(bridge.cancelIronwoodMigrationProcess).toHaveBeenCalled();
  });

  test('Tests that nothing is cancelled when no migration is under way', async () => {
    statusWith(null);

    await cancelOldPrivateMigration();

    expect(bridge.cancelIronwoodMigrationProcess).not.toHaveBeenCalled();
  });

  test('Tests that nothing is cancelled when the migration is complete', async () => {
    statusWith({ kind: 'complete', residual: 40000 });

    await cancelOldPrivateMigration();

    expect(bridge.cancelIronwoodMigrationProcess).not.toHaveBeenCalled();
  });
});
