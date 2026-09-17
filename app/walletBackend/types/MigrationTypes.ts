/**
 * The migration records as the screens render them: the generated shapes
 * with every zatoshi amount, height and timestamp as a number.
 */

export type DrainTransactionType = {
  inputs: number[];
  output: number;
  fee: number;
};

export type DrainPlanType = {
  transactions: DrainTransactionType[];
  migrated: number;
  fee: number;
  residual: number;
};

export type SplitTransactionType = {
  inputs: number[];
  outputs: number[];
  fee: number;
};

export type MigrationPlanType = {
  splitRounds: SplitTransactionType[][];
  parts: number[];
  splitFee: number;
  partsFee: number;
  residual: number;
  planHash: string;
};

export type MigrationPhaseType =
  | { kind: 'planned' }
  | { kind: 'noteSplitting'; round: number; pendingTxids: string[] }
  | { kind: 'partsScheduled' }
  | { kind: 'complete'; residual: number };

export type BroadcastWindowType = {
  bucketIndex: number;
  boundary: number;
  partIds: number[];
  denominations: number[];
  windowOpensUnixTime: number;
  latestTargetUnixTime: number;
};

export type DueBatchType = {
  boundary: number;
  partIds: number[];
  denominations: number[];
};

export type MigrationStatusType = {
  orchardConfirmedSpendable: number;
  phase: MigrationPhaseType | undefined;
  partsTotal: number;
  partsConfirmed: number;
  partsBroadcast: number;
  valueTotal: number;
  valueMigrated: number;
  perBucket: number | undefined;
  bucketModulus: number;
  upcomingWindows: BroadcastWindowType[];
  dueNow: DueBatchType | undefined;
};

export type WindowReportType = {
  bucketIndex: number;
  boundary: number;
  close: number;
  isCurrent: boolean;
  partsTotal: number;
  partsConfirmed: number;
  valueTotal: number;
  valueMigrated: number;
};
