/**
 * The private-migration wrapper family (zingo-mobile#1187): all seven
 * walletUtils wrappers around the ZIP 318 bridge methods share one
 * contract, so one table exercises them all:
 *   - a non-empty resolution passes through verbatim, even when it wears
 *     the error sentinel (the sniff only logs, it never classifies);
 *   - an empty resolution becomes the internal-RPC error string;
 *   - a rejection is contained as `Error: ...`, never thrown;
 *   - numeric arguments cross the bridge as strings, null cadence as ''.
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
  cancelIronwoodMigration,
  continueNoteSplitting,
  migrationStatus,
  planIronwoodMigration,
  reconcileMigration,
  rescheduleParts,
  startIronwoodMigration,
} from '../app/walletBackend/utils/walletUtils';

const bridge = RPCModule as unknown as Record<string, jest.Mock>;

const consentPlanHash = 'ab'.repeat(32);

// The widened signature through which a case's untyped callArgs are applied.
type CallableWrapper = (...args: unknown[]) => Promise<string>;

// Each case names only the wrapper and its arguments. The bridge method
// (`${wrapper.name}Process`) and the internal-error spelling (wrapper.name)
// are derived, so each wrapper's identity is written exactly once — in the
// code under test.
type WrapperCase = {
  wrapper: (...args: never[]) => Promise<string>;
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
  { wrapper: cancelIronwoodMigration, callArgs: [], expectedBridgeArgs: [] },
];

describe('private-migration wrappers share one bridge contract', () => {
  it.each(wrapperCases)(
    '$wrapper.name',
    async ({ wrapper, callArgs, expectedBridgeArgs }) => {
      const bridgeMethod = bridge[`${wrapper.name}Process`];
      const callWrapper = () => (wrapper as CallableWrapper)(...callArgs);

      // Passthrough is unconditional: a resolution wearing the error
      // sentinel is logged but returned verbatim, like any other data.
      const passthroughResolutions = [
        '{ "started": true }',
        'Error: ConsentStale',
      ];
      for (const resolution of passthroughResolutions) {
        bridgeMethod.mockResolvedValueOnce(resolution);
        await expect(callWrapper()).resolves.toBe(resolution);
        expect(bridgeMethod).toHaveBeenLastCalledWith(...expectedBridgeArgs);
      }

      bridgeMethod.mockResolvedValueOnce('');
      await expect(callWrapper()).resolves.toBe(
        `Error: Internal RPC Error: ${wrapper.name}`,
      );

      bridgeMethod.mockRejectedValueOnce(new Error('bridge exploded'));
      await expect(callWrapper()).resolves.toMatch(/^Error: /);
    },
  );
});
