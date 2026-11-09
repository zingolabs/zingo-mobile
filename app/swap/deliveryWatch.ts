import { SwapDirectionEnum } from './SwapDirectionEnum';
import { SwapStatusEnum } from './SwapStatusEnum';
import { isRealLegHash } from './trackUpdateBase';
import { isThorchainFamily } from './thorchainFamily';
import { SwapRecordType } from './SwapRecordType';

/** How long a finished purchase is still asked about, for its delivery. */
export const DELIVERY_WATCH_MS = 24 * 60 * 60 * 1000;

/**
 * A Maya or THORChain purchase with no ZEC transaction on the record. `/track`
 * can say completed from the deposit alone, with no leg on Zcash.
 */
export function lacksDelivery(record: SwapRecordType): boolean {
  return (
    record.direction === SwapDirectionEnum.Inbound &&
    isThorchainFamily(record.provider) &&
    !isRealLegHash(record.destinationTxHash)
  );
}

/** A completed purchase that keeps being tracked until its delivery shows. */
export function watchesDelivery(
  record: SwapRecordType,
  nowMs: number,
): boolean {
  return (
    record.status === SwapStatusEnum.Completed &&
    lacksDelivery(record) &&
    record.terminalAtMs !== undefined &&
    nowMs - record.terminalAtMs < DELIVERY_WATCH_MS
  );
}
