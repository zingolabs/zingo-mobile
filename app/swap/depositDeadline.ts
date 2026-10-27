import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { hasDepositEvidence } from './depositEvidence';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * How long Zingo waits for an inbound deposit, from the moment the payment
 * address is made. Internal: it never shows on screen. Past it with nothing
 * seen, the swap closes as "Deposit not detected".
 */
export const DEPOSIT_WAIT_MS = 24 * 60 * 60 * 1000;

/** How long after the payment address is made the wait turns to a warning. */
export const DEPOSIT_WARN_AFTER_MS = 30 * 60 * 1000;

/** When the wait for the deposit ends: the record's own, or the wait from its creation. */
export function depositDeadlineMs(record: {
  createdAtMs: number;
  depositDeadlineMs?: number;
}): number {
  return record.depositDeadlineMs ?? record.createdAtMs + DEPOSIT_WAIT_MS;
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

/** When a deposit not seen yet turns to a warning. */
export function depositWarnAtMs(record: { createdAtMs: number }): number {
  return record.createdAtMs + DEPOSIT_WARN_AFTER_MS;
}

/**
 * Where an inbound swap stands for the user: waiting for them to pay,
 * looking for a payment they said they sent, past the warning with
 * nothing seen, the payment seen and confirming, or the swap itself moving.
 */
export type DepositPhase =
  'awaiting' | 'looking' | 'notDetected' | 'detected' | 'swapping';

export function depositPhase(
  record: SwapRecordType,
  nowMs: number,
): DepositPhase {
  if (awaitsDeposit(record)) {
    if (record.depositSentAtMs === undefined) return 'awaiting';
    return nowMs >= depositWarnAtMs(record) ? 'notDetected' : 'looking';
  }
  if (
    record.direction === SwapDirectionEnum.Inbound &&
    record.status === SwapStatusEnum.Pending
  ) {
    return 'detected';
  }
  return 'swapping';
}
