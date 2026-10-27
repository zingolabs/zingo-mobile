import { SwapRecordType } from './types/SwapRecordType';
import { SwapPrefillType } from './types/SwapPrefillType';

/** The same purchase again, at today's price. */
export function prefillFromRecord(
  record: SwapRecordType,
  nowMs: number,
): SwapPrefillType {
  return {
    sellAsset: record.sellAsset,
    sellAmountHumanDecimal: record.sellAmountHumanDecimal,
    refundAddress: record.sourceAddress,
    requestedAtMs: nowMs,
  };
}
