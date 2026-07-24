/**
 * The private-migration wrapper family (zingo-mobile#1187): all nine
 * walletUtils wrappers around the ZIP 318 bridge methods share one typed
 * FFI contract, so one table exercises them all:
 *   - a resolution passes through verbatim as { ok: true }, even when it
 *     wears the historical error sentinel (data is never sniffed);
 *   - a rejection whose `.code` is a ZingolibError variant name maps to
 *     { ok: false } with that code;
 *   - a rejection without a recognized code maps to code 'Unknown';
 *   - numeric arguments cross the bridge as strings, null cadence as ''.
 */
// Every member of the mocked bridge is a lazily created jest.fn, so a future
// import-time touch of some other RPCModule member cannot break this suite.
jest.mock('../app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import RPCModule from '../app/RPCModule';
import { FfiResult } from '../app/walletBackend/ffi';
import {
  cancelIronwoodMigration,
  continueNoteSplitting,
  executeDueParts,
  executeDuePartsStatus,
  migrationStatus,
  planIronwoodMigration,
  reconcileMigration,
  rescheduleParts,
  startIronwoodMigration,
} from '../app/walletBackend/utils/walletUtils';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const consentPlanHash = 'ab'.repeat(32);

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
  { wrapper: planIronwoodMigration, callArgs: [], expectedBridgeArgs: [] },
  {
    wrapper: startIronwoodMigration,
    // A null cadence crosses as the empty string ("keep zingolib's default").
    callArgs: [consentPlanHash, null],
    expectedBridgeArgs: [consentPlanHash, ''],
  },
  {
    wrapper: startIronwoodMigration,
    callArgs: [consentPlanHash, 4],
    expectedBridgeArgs: [consentPlanHash, '4'],
  },
  { wrapper: continueNoteSplitting, callArgs: [], expectedBridgeArgs: [] },
  { wrapper: rescheduleParts, callArgs: [8], expectedBridgeArgs: ['8'] },
  { wrapper: migrationStatus, callArgs: [], expectedBridgeArgs: [] },
  { wrapper: reconcileMigration, callArgs: [], expectedBridgeArgs: [] },
  { wrapper: executeDueParts, callArgs: [2000], expectedBridgeArgs: ['2000'] },
  { wrapper: executeDuePartsStatus, callArgs: [], expectedBridgeArgs: [] },
  { wrapper: cancelIronwoodMigration, callArgs: [], expectedBridgeArgs: [] },
];

describe('private-migration wrappers share one typed FFI contract', () => {
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
