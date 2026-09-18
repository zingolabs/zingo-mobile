// Builds the batch reminder set from a migration status. Pure: the schedule
// confirmation and the re-arm hook both arm from here, so a reminder's time,
// id and batch number never depend on which screen armed it.
import { reminderTimestampMs } from '@app/AppState/const/BlockTime';
import { RPCMigrationStatusType } from '@app/walletBackend/types/RPCMigrationStatusType';
import { BatchReminder } from './reminders';

export type ReminderChain = {
  latestBlock?: number;
  secondsPerBlock?: number;
  mainnet: boolean;
};

export type ReminderText = {
  // The title for batch number `n`.
  title: (n: number) => string;
  body: string;
};

// ZIP 318's window length, for a status that does not carry one.
const DEFAULT_BUCKET_MODULUS = 144;

// The batch number of the first upcoming window, counted as the status screen
// does: batches whose parts all confirmed, plus the one open now (due) or
// already sent and confirming, which upcoming_windows never carries.
export function firstUpcomingBatchNumber(
  status: RPCMigrationStatusType,
): number {
  const perBucket = Math.max(1, status.per_bucket ?? 1);
  const batchesTotal = Math.max(1, Math.ceil(status.parts_total / perBucket));
  const batchesConfirmed = Math.min(
    batchesTotal,
    Math.floor(status.parts_confirmed / perBucket),
  );
  const current = status.due_now != null || status.parts_broadcast > 0;
  return batchesConfirmed + (current ? 2 : 1);
}

export function buildBatchReminders(
  status: RPCMigrationStatusType,
  chain: ReminderChain,
  text: ReminderText,
  nowMs: number,
): BatchReminder[] {
  const base = firstUpcomingBatchNumber(status);
  const bucketModulus = status.bucket_modulus || DEFAULT_BUCKET_MODULUS;
  return (status.upcoming_windows ?? []).map((wake, i) => ({
    id: String(wake.bucket_index),
    timestampMs: reminderTimestampMs(wake, bucketModulus, chain, nowMs),
    title: text.title(base + i),
    body: text.body,
  }));
}

// What the armed set depends on besides time: which windows are coming, where
// they open, and how they are numbered. A change means the armed reminders are
// stale (a batch slid or was rebuilt into another window, a window opened or
// entered the horizon, a batch was sent); an unchanged signature means
// re-arming would only nudge the same reminders by the estimate's drift.
export function batchRemindersSignature(
  status: RPCMigrationStatusType,
): string {
  const windows = (status.upcoming_windows ?? [])
    .map(wake => `${wake.bucket_index}:${wake.boundary}`)
    .join(',');
  return `${firstUpcomingBatchNumber(status)}|${windows}`;
}
