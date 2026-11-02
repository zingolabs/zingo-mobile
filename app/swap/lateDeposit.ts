import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapStatusEnum, isTerminalStatus } from './enums/SwapStatusEnum';
import { depositDeadlineMs } from './depositDeadline';
import { hasDepositEvidence } from './depositEvidence';
import { SwapRecordType } from './types/SwapRecordType';

/** How long an expired purchase is still asked about, for a payment that came late. */
export const LATE_WATCH_MS = 24 * 60 * 60 * 1000;

/**
 * An expired purchase the provider may still see a late payment for: no
 * deposit seen, and within the watch after it expired.
 */
export function watchesLateDeposit(
  record: SwapRecordType,
  nowMs: number,
): boolean {
  if (record.status !== SwapStatusEnum.Expired) return false;
  if (record.direction !== SwapDirectionEnum.Inbound) return false;
  if (hasDepositEvidence(record)) return false;
  const expiredAtMs = record.terminalAtMs ?? depositDeadlineMs(record);
  return nowMs - expiredAtMs < LATE_WATCH_MS;
}

/**
 * Whether a `/track` answer may move an expired purchase on. Only a payment
 * the provider saw, or a verdict on one, does; anything else leaves the
 * swap expired, since an unpaid address can answer with an open state.
 */
export function acceptsLateUpdate(updated: SwapRecordType): boolean {
  return (
    hasDepositEvidence(updated) ||
    updated.status === SwapStatusEnum.Refunded ||
    updated.status === SwapStatusEnum.Completed ||
    updated.status === SwapStatusEnum.Failed
  );
}

/** A purchase paid after its quote expired, on its way back to the refund address. */
export function isRefunding(
  record: Pick<SwapRecordType, 'status' | 'lateDepositAtMs'>,
): boolean {
  return (
    record.lateDepositAtMs !== undefined && !isTerminalStatus(record.status)
  );
}
