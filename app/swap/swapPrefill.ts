import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapRecordType } from './types/SwapRecordType';
import { SwapPrefillType } from './types/SwapPrefillType';

/** The same swap again, at today's price. */
export function prefillFromRecord(
  record: SwapRecordType,
  nowMs: number,
): SwapPrefillType {
  const selling = record.direction === SwapDirectionEnum.Outbound;
  return {
    direction: record.direction,
    asset: selling ? record.receiveAsset : record.sellAsset,
    sellAmountHumanDecimal: record.sellAmountHumanDecimal,
    address: selling ? record.destinationAddress : record.sourceAddress,
    requestedAtMs: nowMs,
  };
}
