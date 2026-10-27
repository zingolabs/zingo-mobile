import { SwapAssetType } from './SwapAssetType';

/**
 * What a new quote starts from: the coin, the amount and the refund address
 * of a purchase whose deposit never came. `requestedAtMs` tells one request
 * from the next, so asking twice for the same swap fills the form twice.
 */
export type SwapPrefillType = {
  sellAsset: SwapAssetType;
  sellAmountHumanDecimal: string;
  refundAddress: string;
  requestedAtMs: number;
};
