/**
 * The private-migration wrappers: each forwards to its wallet method, the
 * record-returning ones convert zatoshi amounts and tagged phases to the
 * app's number-typed records, and a rejection keeps its tag.
 */
jest.mock('@app/RPCModule', () =>
  require('../__mocks__/rpcModuleProxy').rpcModuleProxyMock(),
);

import {
  JobKind,
  MigrationPhase,
  PartResult,
  SplitOutcome,
  ZingoError,
  ZingoError_Tags,
} from 'zingo-ffi';
import {
  cancelIronwoodMigration,
  continueNoteSplitting,
  executeDueParts,
  migrationStatus,
  planIronwoodMigration,
  quickSplit,
  reconcileMigration,
  rescheduleParts,
  startIronwoodMigration,
  windowTimeline,
} from '@app/walletBackend/utils/walletUtils';
import { installMockWallet, MockWallet } from '../__mocks__/mockWallet';

let wallet: MockWallet;
beforeEach(() => {
  wallet = installMockWallet().wallet;
});

const consentPlanHash = 'ab'.repeat(32);

describe('argument forwarding', () => {
  test.each([
    ['startMigration', () => startIronwoodMigration(consentPlanHash, undefined), [consentPlanHash, undefined]],
    ['startMigration', () => startIronwoodMigration(consentPlanHash, 4), [consentPlanHash, 4]],
    ['rescheduleParts', () => rescheduleParts(8), [8]],
    ['executeDueParts', () => executeDueParts(2000), [2000n]],
    ['cancelMigration', () => cancelIronwoodMigration(), []],
    ['continueNoteSplitting', () => continueNoteSplitting(), []],
    ['splitRound', () => quickSplit(), []],
    ['reconcileMigration', () => reconcileMigration(), []],
  ] as Array<[string, () => Promise<unknown>, unknown[]]>)(
    'Tests that %s receives its arguments when the wrapper is called',
    async (method, call, args) => {
      wallet[method].mockResolvedValue(undefined);
      await call();
      expect(wallet[method]).toHaveBeenCalledWith(...args);
    },
  );

  test('Tests that a rejection keeps its tag when the wallet refuses', async () => {
    wallet.startMigration.mockRejectedValue(
      new ZingoError.MigrationConsentStale({ detail: 'notes changed' }),
    );
    await expect(
      startIronwoodMigration(consentPlanHash, 4),
    ).resolves.toMatchObject({
      ok: false,
      error: {
        tag: ZingoError_Tags.MigrationConsentStale,
        detail: 'notes changed',
      },
    });
  });

  test('Tests that a Busy rejection names the running job when another job holds the wallet', async () => {
    wallet.splitRound.mockRejectedValue(
      new ZingoError.Busy({ running: JobKind.Reconcile }),
    );
    await expect(quickSplit()).resolves.toMatchObject({
      ok: false,
      error: { tag: ZingoError_Tags.Busy, detail: 'Reconcile' },
    });
  });
});

describe('record conversion', () => {
  test('Tests that the plan converts its amounts to numbers when the wallet answers', async () => {
    wallet.planMigration.mockResolvedValue({
      splitRounds: [
        { transactions: [{ inputs: [250n], outputs: [100n, 100n], fee: 50n }] },
      ],
      parts: [100n, 100n],
      splitFee: 50n,
      partsFee: 20n,
      residual: 5n,
      planHash: consentPlanHash,
    });
    await expect(planIronwoodMigration()).resolves.toEqual({
      ok: true,
      value: {
        splitRounds: [[{ inputs: [250], outputs: [100, 100], fee: 50 }]],
        parts: [100, 100],
        splitFee: 50,
        partsFee: 20,
        residual: 5,
        planHash: consentPlanHash,
      },
    });
  });

  test('Tests that the status converts its phase, windows and due batch when the wallet answers', async () => {
    wallet.migrationStatus.mockResolvedValue({
      orchardConfirmedSpendable: 1_000n,
      phase: new MigrationPhase.NoteSplitting({
        round: 1,
        pendingTxids: ['t1'],
      }),
      partsTotal: 4,
      partsConfirmed: 1,
      partsBroadcast: 1,
      valueTotal: 400n,
      valueMigrated: 100n,
      perBucket: 2,
      bucketModulus: 144,
      upcomingWindows: [
        {
          bucketIndex: 17n,
          boundary: 2_448,
          partIds: [2, 3],
          denominations: [100n, 100n],
          windowOpensUnixTime: 1_700_000_000n,
          latestTargetUnixTime: 1_700_003_600n,
        },
      ],
      dueNow: { boundary: 2_304, partIds: [1], denominations: [100n] },
    });
    await expect(migrationStatus()).resolves.toEqual({
      ok: true,
      value: {
        orchardConfirmedSpendable: 1_000,
        phase: { kind: 'noteSplitting', round: 1, pendingTxids: ['t1'] },
        partsTotal: 4,
        partsConfirmed: 1,
        partsBroadcast: 1,
        valueTotal: 400,
        valueMigrated: 100,
        perBucket: 2,
        bucketModulus: 144,
        upcomingWindows: [
          {
            bucketIndex: 17,
            boundary: 2_448,
            partIds: [2, 3],
            denominations: [100, 100],
            windowOpensUnixTime: 1_700_000_000,
            latestTargetUnixTime: 1_700_003_600,
          },
        ],
        dueNow: { boundary: 2_304, partIds: [1], denominations: [100] },
      },
    });
  });

  test('Tests that a status without a migration reads with an undefined phase when none is in progress', async () => {
    wallet.migrationStatus.mockResolvedValue({
      orchardConfirmedSpendable: 0n,
      phase: undefined,
      partsTotal: 0,
      partsConfirmed: 0,
      partsBroadcast: 0,
      valueTotal: 0n,
      valueMigrated: 0n,
      perBucket: undefined,
      bucketModulus: 144,
      upcomingWindows: [],
      dueNow: undefined,
    });
    await expect(migrationStatus()).resolves.toMatchObject({
      ok: true,
      value: { phase: undefined, perBucket: undefined, dueNow: undefined },
    });
  });

  test('Tests that the timeline converts each window when the wallet has synced', async () => {
    wallet.windowTimeline.mockResolvedValueOnce([
      {
        bucketIndex: 3n,
        boundary: 432,
        close: 576,
        isCurrent: true,
        partsTotal: 1,
        partsConfirmed: 0,
        valueTotal: 100n,
        valueMigrated: 0n,
      },
    ]);
    await expect(windowTimeline()).resolves.toEqual({
      ok: true,
      value: [
        {
          bucketIndex: 3,
          boundary: 432,
          close: 576,
          isCurrent: true,
          partsTotal: 1,
          partsConfirmed: 0,
          valueTotal: 100,
          valueMigrated: 0,
        },
      ],
    });
    wallet.windowTimeline.mockResolvedValueOnce(undefined);
    await expect(windowTimeline()).resolves.toEqual({
      ok: true,
      value: undefined,
    });
  });

  test('Tests that the split outcome and batch report cross untouched when the wallet answers', async () => {
    const outcome = new SplitOutcome.Round({ txids: ['t1'] });
    wallet.splitRound.mockResolvedValue(outcome);
    await expect(quickSplit()).resolves.toEqual({ ok: true, value: outcome });

    const report = {
      outcomes: [
        { part: 1, denomination: 100n, result: new PartResult.Sent({ txid: 't' }) },
      ],
      halted: undefined,
    };
    wallet.executeDueParts.mockResolvedValue(report);
    await expect(executeDueParts(10)).resolves.toEqual({
      ok: true,
      value: report,
    });
  });
});
