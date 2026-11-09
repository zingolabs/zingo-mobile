import { SwapDirectionEnum } from './SwapDirectionEnum';
import { SwapAssetType } from './SwapAssetType';
import { SwapRecordType } from './SwapRecordType';
import { SwapPrefillType } from './SwapPrefillType';

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

/**
 * A new swap with a saved contact: `address` is the destination selling ZEC
 * and the refund address buying it. The amount is left to the user.
 */
export function prefillFromContact(
  direction: SwapDirectionEnum,
  asset: SwapAssetType,
  address: string,
  nowMs: number,
): SwapPrefillType {
  return {
    direction,
    asset,
    sellAmountHumanDecimal: '',
    address,
    requestedAtMs: nowMs,
  };
}
