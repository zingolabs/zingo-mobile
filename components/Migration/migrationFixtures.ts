// Backend payloads for the migration screen stories. Values in zatoshis,
// mirroring what zingolib returns through the bridge.
import { RPCMigrationPlanType } from '../../app/walletBackend/types/RPCMigrationPlanType';
import { RPCMigrationStatusType } from '../../app/walletBackend/types/RPCMigrationStatusType';
import { RPCDrainPlanType } from '../../app/walletBackend/types/RPCDrainPlanType';
import { RPCDrainStatusType } from '../../app/walletBackend/types/RPCDrainStatusType';
import { RPCBatchStatusType } from '../../app/walletBackend/types/RPCBatchStatusType';
import { RPCBatchReportType } from '../../app/walletBackend/types/RPCBatchReportType';

const ZEC = 100_000_000;
const PART = 49_990_000;

export const planHash = 'ab'.repeat(32);

export const txids = [
  '7f3a9c1d2e4b5a6f8091b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061',
  '1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f60718293a4b5c6d7e8f9a0b',
  'e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4',
];

// Two splitting rounds resize a 2.5 ZEC note into five parts.
export const splitPlan: RPCMigrationPlanType = {
  split_rounds: [
    [{ inputs: [2.5 * ZEC], outputs: [ZEC, ZEC, PART], fee: 10_000 }],
    [
      { inputs: [ZEC], outputs: [PART, PART], fee: 20_000 },
      { inputs: [ZEC], outputs: [PART, PART], fee: 20_000 },
    ],
  ],
  parts: [PART, PART, PART, PART, PART],
  split_fee: 50_000,
  parts_fee: 50_000,
  residual: 12_345,
  plan_hash: planHash,
};

// Notes already part-sized: no splitting rounds, straight to the cadence.
export const readyPlan: RPCMigrationPlanType = {
  ...splitPlan,
  split_rounds: [],
  split_fee: 0,
};

export const dustPlan: RPCMigrationPlanType = {
  split_rounds: [],
  parts: [],
  split_fee: 0,
  parts_fee: 0,
  residual: 4_000,
  plan_hash: planHash,
};

export const unconfirmedPlan: RPCMigrationPlanType = {
  ...dustPlan,
  residual: 0,
};

export const drainPlan: RPCDrainPlanType = {
  transactions: [
    { inputs: [1.2 * ZEC, 0.3 * ZEC], output: 1.5 * ZEC - 10_000, fee: 10_000 },
    { inputs: [0.75 * ZEC], output: 0.75 * ZEC - 10_000, fee: 10_000 },
  ],
  migrated: 2.25 * ZEC - 20_000,
  fee: 20_000,
  residual: 5_000,
};

export const emptyDrainPlan: RPCDrainPlanType = {
  transactions: [],
  migrated: 0,
  fee: 0,
  residual: 3_000,
};

export const pendingDrainPlan: RPCDrainPlanType = {
  ...emptyDrainPlan,
  residual: 0,
};

export const drainBuilding: RPCDrainStatusType = {
  total: 2,
  built: 1,
  sent: 0,
  phase: 'building',
};

const windowAt = (bucket: number, boundary: number, parts: number[]) => ({
  bucket_index: bucket,
  boundary,
  part_ids: parts,
  denominations: parts.map(() => PART),
  window_opens_unix_time: 1_700_000_000 + (bucket - 17_362) * 10_800,
  latest_target_unix_time: 1_700_003_600 + (bucket - 17_362) * 10_800,
});

// Nothing planned yet: what the cadence chooser reads before consent.
export const idleStatus: RPCMigrationStatusType = {
  orchard_confirmed_spendable: 2.5 * ZEC,
  phase: null,
  parts_total: 0,
  parts_confirmed: 0,
  parts_broadcast: 0,
  value_total: 0,
  value_migrated: 0,
  per_bucket: null,
  bucket_modulus: 144,
  upcoming_windows: [],
  due_now: null,
};

// Two of five parts confirmed, the rest scheduled across coming windows.
export const scheduledStatus: RPCMigrationStatusType = {
  orchard_confirmed_spendable: 1.5 * ZEC,
  phase: { kind: 'parts_scheduled' },
  parts_total: 5,
  parts_confirmed: 2,
  parts_broadcast: 0,
  value_total: 5 * PART,
  value_migrated: 2 * PART,
  per_bucket: 2,
  bucket_modulus: 144,
  upcoming_windows: [
    windowAt(17_362, 2_500_128, [2, 3]),
    windowAt(17_363, 2_500_272, [4]),
  ],
  due_now: null,
};

// The chain is inside a window: a batch is sendable now.
export const dueNowStatus: RPCMigrationStatusType = {
  ...scheduledStatus,
  upcoming_windows: [windowAt(17_363, 2_500_272, [4])],
  due_now: {
    boundary: 2_499_984,
    part_ids: [2, 3],
    denominations: [PART, PART],
  },
};

// A batch broadcast and still mining.
export const confirmingStatus: RPCMigrationStatusType = {
  ...dueNowStatus,
  parts_broadcast: 2,
  due_now: null,
};

export const completeStatus: RPCMigrationStatusType = {
  ...scheduledStatus,
  orchard_confirmed_spendable: 12_345,
  phase: { kind: 'complete', residual: 12_345 },
  parts_confirmed: 5,
  value_migrated: 5 * PART,
  upcoming_windows: [],
};

// Scheduled with nothing bound: the only exit is to start over.
export const stalledStatus: RPCMigrationStatusType = {
  ...idleStatus,
  phase: { kind: 'parts_scheduled' },
  per_bucket: 2,
};

export const batchSpacing: RPCBatchStatusType = {
  total: 2,
  resolved: 1,
  sent: 1,
  phase: 'spacing',
};

// Every part skipped: nothing broadcast, nothing lost.
export const skippedBatch: RPCBatchReportType = {
  outcomes: [
    { part: 2, denomination: PART, result: { kind: 'slid' } },
    {
      part: 3,
      denomination: PART,
      result: { kind: 'not_due', window_opens_unix_time: 1_700_000_000 },
    },
  ],
  halted: null,
};

export const haltedBatch: RPCBatchReportType = {
  outcomes: [
    { part: 2, denomination: PART, result: { kind: 'sent', txid: txids[0] } },
    {
      part: 3,
      denomination: PART,
      result: { kind: 'failed', error: 'broadcast refused: mempool full' },
    },
  ],
  halted: 'broadcast refused: mempool full',
};
