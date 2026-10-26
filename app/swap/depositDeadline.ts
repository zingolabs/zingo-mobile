import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { hasDepositEvidence } from './depositEvidence';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * How long a deposit waits when the quote names no expiry. Records made
 * before the deadline was kept have none either, and read this window from
 * their creation.
 */
export const DEPOSIT_WINDOW_MS = 15 * 60 * 1000;

/** When the deposit must be paid by: the quote's deadline, or the window. */
export function depositDeadlineMs(record: {
  createdAtMs: number;
  depositDeadlineMs?: number;
}): number {
  return record.depositDeadlineMs ?? record.createdAtMs + DEPOSIT_WINDOW_MS;
}

/** An inbound swap whose deposit the provider has not seen. */
export function awaitsDeposit(record: SwapRecordType): boolean {
  return (
    record.status === SwapStatusEnum.AwaitingExternalDeposit &&
    !hasDepositEvidence(record)
  );
}

/** An awaited deposit whose deadline has passed. */
export function depositOverdue(record: SwapRecordType, nowMs: number): boolean {
  return awaitsDeposit(record) && nowMs >= depositDeadlineMs(record);
}
