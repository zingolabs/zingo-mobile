/**
 * Converts the generated migration records into their number-typed twins.
 */
import {
  BroadcastWindow,
  DrainPlan,
  DueBatch,
  MigrationPhase,
  MigrationPhase_Tags,
  MigrationPlan,
  MigrationStatus,
  WindowReport,
} from 'zingo-ffi';
import { zats } from '@app/walletBackend/ffi';
import {
  BroadcastWindowType,
  DrainPlanType,
  DueBatchType,
  MigrationPhaseType,
  MigrationPlanType,
  MigrationStatusType,
  WindowReportType,
} from '@app/walletBackend/types/MigrationTypes';

const numbers = (amounts: bigint[]): number[] => amounts.map(zats);

export function transformDrainPlan(plan: DrainPlan): DrainPlanType {
  return {
    transactions: plan.transactions.map(tx => ({
      inputs: numbers(tx.inputs),
      output: zats(tx.output),
      fee: zats(tx.fee),
    })),
    migrated: zats(plan.migrated),
    fee: zats(plan.fee),
    residual: zats(plan.residual),
  };
}

export function transformMigrationPlan(plan: MigrationPlan): MigrationPlanType {
  return {
    splitRounds: plan.splitRounds.map(round =>
      round.transactions.map(tx => ({
        inputs: numbers(tx.inputs),
        outputs: numbers(tx.outputs),
        fee: zats(tx.fee),
      })),
    ),
    parts: numbers(plan.parts),
    splitFee: zats(plan.splitFee),
    partsFee: zats(plan.partsFee),
    residual: zats(plan.residual),
    planHash: plan.planHash,
  };
}

function transformPhase(phase: MigrationPhase): MigrationPhaseType {
  switch (phase.tag) {
    case MigrationPhase_Tags.Planned:
      return { kind: 'planned' };
    case MigrationPhase_Tags.NoteSplitting:
      return {
        kind: 'noteSplitting',
        round: phase.inner.round,
        pendingTxids: phase.inner.pendingTxids,
      };
    case MigrationPhase_Tags.PartsScheduled:
      return { kind: 'partsScheduled' };
    case MigrationPhase_Tags.Complete:
      return { kind: 'complete', residual: zats(phase.inner.residual) };
  }
}

function transformWindow(window: BroadcastWindow): BroadcastWindowType {
  return {
    bucketIndex: zats(window.bucketIndex),
    boundary: window.boundary,
    partIds: window.partIds,
    denominations: numbers(window.denominations),
    windowOpensUnixTime: zats(window.windowOpensUnixTime),
    latestTargetUnixTime: zats(window.latestTargetUnixTime),
  };
}

function transformDueBatch(batch: DueBatch): DueBatchType {
  return {
    boundary: batch.boundary,
    partIds: batch.partIds,
    denominations: numbers(batch.denominations),
  };
}

export function transformMigrationStatus(
  status: MigrationStatus,
): MigrationStatusType {
  return {
    orchardConfirmedSpendable: zats(status.orchardConfirmedSpendable),
    phase:
      status.phase === undefined ? undefined : transformPhase(status.phase),
    partsTotal: status.partsTotal,
    partsConfirmed: status.partsConfirmed,
    partsBroadcast: status.partsBroadcast,
    valueTotal: zats(status.valueTotal),
    valueMigrated: zats(status.valueMigrated),
    perBucket: status.perBucket,
    bucketModulus: status.bucketModulus,
    upcomingWindows: status.upcomingWindows.map(transformWindow),
    dueNow:
      status.dueNow === undefined
        ? undefined
        : transformDueBatch(status.dueNow),
  };
}

export function transformWindowReport(report: WindowReport): WindowReportType {
  return {
    bucketIndex: zats(report.bucketIndex),
    boundary: report.boundary,
    close: report.close,
    isCurrent: report.isCurrent,
    partsTotal: report.partsTotal,
    partsConfirmed: report.partsConfirmed,
    valueTotal: zats(report.valueTotal),
    valueMigrated: zats(report.valueMigrated),
  };
}
