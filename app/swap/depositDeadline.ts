import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { hasDepositEvidence } from './depositEvidence';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * How long Zingo waits for an inbound deposit, from the moment the payment
 * address is made. Internal: it never shows on screen. Past it, or past the
 * provider's quote deadline if that comes first, with nothing seen, the swap
 * closes as "Deposit not detected".
 */
export const DEPOSIT_WAIT_MS = 12 * 60 * 60 * 1000;

/** How long after the payment address is made the wait turns to a warning. */
export const DEPOSIT_WARN_AFTER_MS = 30 * 60 * 1000;

/**
 * Source chains whose deposit the providers see late, once blocks slower
 * than the rest confirm it: the warning waits longer, and the wait says so.
 */
export const SLOW_DEPOSIT_WARN_AFTER_MS: Record<string, number> = {
  BTC: 90 * 60 * 1000,
};

/** Whether this swap is paid on a chain whose deposit is seen late. */
export function slowDeposit(record: { sellAsset: { chain: string } }): boolean {
  return record.sellAsset.chain in SLOW_DEPOSIT_WARN_AFTER_MS;
}

/**
 * When the wait for the deposit ends: the wait from its creation, cut short
 * by the deadline the record kept (records from before the wait was 12 hours
 * kept 24) and by the quote's own deadline.
 */
export function depositDeadlineMs(record: {
  createdAtMs: number;
  depositDeadlineMs?: number;
  quoteExpiresAtMs?: number;
}): number {
  return Math.min(
    record.createdAtMs + DEPOSIT_WAIT_MS,
    record.depositDeadlineMs ?? Infinity,
    record.quoteExpiresAtMs ?? Infinity,
  );
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
export function depositWarnAtMs(record: {
  createdAtMs: number;
  sellAsset: { chain: string };
}): number {
  return (
    record.createdAtMs +
    (SLOW_DEPOSIT_WARN_AFTER_MS[record.sellAsset.chain] ??
      DEPOSIT_WARN_AFTER_MS)
  );
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
    (record.status === SwapStatusEnum.Pending ||
      record.status === SwapStatusEnum.AwaitingExternalDeposit)
  ) {
    return 'detected';
  }
  return 'swapping';
}
