import { SwapStatusEnum } from './SwapStatusEnum';
import { hasDepositEvidence } from './depositEvidence';
import { SwapRecordType } from './SwapRecordType';

/** How long `/track` gets to recognise a deposit hash. */
export const UNKNOWN_HASH_MS = 24 * 60 * 60 * 1000;

/**
 * A swap left in progress on a deposit hash `/track` has never recognised,
 * which an older build let the user type unchecked. `/track` refuses such a
 * hash, so the record never carries its stamp and would be polled for good.
 */
export function hasUnknownHash(
  record: Pick<
    SwapRecordType,
    'status' | 'observedDepositTxHash' | 'trackCaptureVersion' | 'updatedAtMs'
  >,
  nowMs: number,
): boolean {
  return (
    record.status === SwapStatusEnum.Pending &&
    !!record.observedDepositTxHash &&
    record.trackCaptureVersion === undefined &&
    nowMs - record.updatedAtMs >= UNKNOWN_HASH_MS
  );
}

/**
 * Whether the user may delete a swap: only one where no money moved. An
 * expired or failed swap the provider never saw a deposit for, a sale whose
 * ZEC never left the wallet, or one stuck on a hash the provider never knew.
 * An awaited deposit expires on its own, and a swap with a payment behind it
 * stays, whatever its outcome, so funds in motion are never hidden.
 */
export function canRemoveSwap(
  record: SwapRecordType,
  nowMs: number = Date.now(),
): boolean {
  switch (record.status) {
    case SwapStatusEnum.PendingDeposit:
      return true;
    case SwapStatusEnum.Pending:
      return hasUnknownHash(record, nowMs);
    case SwapStatusEnum.Expired:
    case SwapStatusEnum.Failed:
      return !hasDepositEvidence(record);
    default:
      return false;
  }
}
