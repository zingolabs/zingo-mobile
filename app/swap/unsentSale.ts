import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { MIN_REMAINING_VALIDITY_MS } from './keepLastQuote';
import { SwapRecordType } from './types/SwapRecordType';

/** A sale the provider reserved whose ZEC never left the wallet. */
export function unsentSale(
  record: Pick<SwapRecordType, 'direction' | 'status'>,
): boolean {
  return (
    record.direction === SwapDirectionEnum.Outbound &&
    record.status === SwapStatusEnum.PendingDeposit
  );
}

/**
 * Whether an unsent sale can still be sent at its quote. One whose expiry
 * was not kept is treated as past it: sending into a stale quote risks a
 * refund less fees, while a new quote costs a tap.
 */
export function canResendSale(record: SwapRecordType, nowMs: number): boolean {
  return (
    unsentSale(record) &&
    record.quoteExpiresAtMs !== undefined &&
    record.quoteExpiresAtMs - nowMs >= MIN_REMAINING_VALIDITY_MS
  );
}
