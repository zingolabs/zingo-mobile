// Wallet answers for the migration screen stories, in the generated shapes
// the wallet handle yields (zatoshi amounts as bigint).
import {
  BatchPhase,
  BatchReport,
  BatchStatus,
  BuildPhase,
  DrainPlan,
  DrainStatus,
  MigrationPhase,
  MigrationPlan,
  MigrationStatus,
  PartResult,
} from 'zingo-ffi';

const ZEC = 100_000_000n;
const PART = 49_990_000n;
const zec = (amount: number): bigint => BigInt(Math.round(amount * 1e8));

export const planHash = 'ab'.repeat(32);

export const txids = [
  '7f3a9c1d2e4b5a6f8091b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061',
  '1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b',
  'e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4',
];

// Two splitting rounds resize a 2.5 ZEC note into five parts.
export const splitPlan: MigrationPlan = {
  splitRounds: [
    {
      transactions: [
        { inputs: [zec(2.5)], outputs: [ZEC, ZEC, PART], fee: 10_000n },
      ],
    },
    {
      transactions: [
        { inputs: [ZEC], outputs: [PART, PART], fee: 20_000n },
        { inputs: [ZEC], outputs: [PART, PART], fee: 20_000n },
      ],
    },
  ],
  parts: [PART, PART, PART, PART, PART],
  splitFee: 50_000n,
  partsFee: 50_000n,
  residual: 12_345n,
  planHash,
};

// Notes already part-sized: no splitting rounds, straight to the cadence.
export const readyPlan: MigrationPlan = {
  ...splitPlan,
  splitRounds: [],
  splitFee: 0n,
};

export const dustPlan: MigrationPlan = {
  splitRounds: [],
  parts: [],
  splitFee: 0n,
  partsFee: 0n,
  residual: 4_000n,
  planHash,
};

export const unconfirmedPlan: MigrationPlan = {
  ...dustPlan,
  residual: 0n,
};

export const drainPlan: DrainPlan = {
  transactions: [
    {
      inputs: [zec(1.2), zec(0.3)],
      output: zec(1.5) - 10_000n,
      fee: 10_000n,
    },
    { inputs: [zec(0.75)], output: zec(0.75) - 10_000n, fee: 10_000n },
  ],
  migrated: zec(2.25) - 20_000n,
  fee: 20_000n,
  residual: 5_000n,
};

export const emptyDrainPlan: DrainPlan = {
  transactions: [],
  migrated: 0n,
  fee: 0n,
  residual: 3_000n,
};

export const pendingDrainPlan: DrainPlan = {
  ...emptyDrainPlan,
  residual: 0n,
};

export const drainBuilding: DrainStatus = {
  total: 2,
  built: 1,
  sent: 0,
  phase: BuildPhase.Building,
};

const windowAt = (bucket: number, boundary: number, parts: number[]) => ({
  bucketIndex: BigInt(bucket),
  boundary,
  partIds: parts,
  denominations: parts.map(() => PART),
  windowOpensUnixTime: BigInt(1_700_000_000 + (bucket - 17_362) * 10_800),
  latestTargetUnixTime: BigInt(1_700_003_600 + (bucket - 17_362) * 10_800),
});

// Nothing planned yet: what the cadence chooser reads before consent.
export const idleStatus: MigrationStatus = {
  orchardConfirmedSpendable: zec(2.5),
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
};

// Two of five parts confirmed, the rest scheduled across coming windows.
export const scheduledStatus: MigrationStatus = {
  orchardConfirmedSpendable: zec(1.5),
  phase: new MigrationPhase.PartsScheduled(),
  partsTotal: 5,
  partsConfirmed: 2,
  partsBroadcast: 0,
  valueTotal: 5n * PART,
  valueMigrated: 2n * PART,
  perBucket: 2,
  bucketModulus: 144,
  upcomingWindows: [
    windowAt(17_362, 2_500_128, [2, 3]),
    windowAt(17_363, 2_500_272, [4]),
  ],
  dueNow: undefined,
};

// The chain is inside a window: a batch is sendable now.
export const dueNowStatus: MigrationStatus = {
  ...scheduledStatus,
  upcomingWindows: [windowAt(17_363, 2_500_272, [4])],
  dueNow: {
    boundary: 2_499_984,
    partIds: [2, 3],
    denominations: [PART, PART],
  },
};

/** The due batch's denominations as the route param the screen renders. */
export const dueNowDenominations = [Number(PART), Number(PART)];

// A batch broadcast and still mining.
export const confirmingStatus: MigrationStatus = {
  ...dueNowStatus,
  partsBroadcast: 2,
  dueNow: undefined,
};

export const completeStatus: MigrationStatus = {
  ...scheduledStatus,
  orchardConfirmedSpendable: 12_345n,
  phase: new MigrationPhase.Complete({ residual: 12_345n }),
  partsConfirmed: 5,
  valueMigrated: 5n * PART,
  upcomingWindows: [],
};

// Scheduled with nothing bound: the only exit is to start over.
export const stalledStatus: MigrationStatus = {
  ...idleStatus,
  phase: new MigrationPhase.PartsScheduled(),
  perBucket: 2,
};

export const batchSpacing: BatchStatus = {
  total: 2,
  resolved: 1,
  sent: 1,
  phase: BatchPhase.Spacing,
};

// Every part skipped: nothing broadcast, nothing lost.
export const skippedBatch: BatchReport = {
  outcomes: [
    { part: 2, denomination: PART, result: new PartResult.Slid() },
    {
      part: 3,
      denomination: PART,
      result: new PartResult.NotDue({ windowOpensUnixTime: 1_700_000_000n }),
    },
  ],
  halted: undefined,
};

export const haltedBatch: BatchReport = {
  outcomes: [
    {
      part: 2,
      denomination: PART,
      result: new PartResult.Sent({ txid: txids[0] }),
    },
    {
      part: 3,
      denomination: PART,
      result: new PartResult.Failed({
        error: 'broadcast refused: mempool full',
      }),
    },
  ],
  halted: 'broadcast refused: mempool full',
};
