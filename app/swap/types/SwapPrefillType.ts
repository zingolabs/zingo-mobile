import { SwapAssetType } from './SwapAssetType';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';

/**
 * What a new quote starts from: the direction, the other coin, the amount
 * and the other coin's address of a swap that never got paid. `requestedAtMs`
 * tells one request from the next, so asking twice for the same swap fills
 * the form twice.
 */
export type SwapPrefillType = {
  direction: SwapDirectionEnum;
  /** The coin that is not ZEC: the one paid, buying; the one received, selling. */
  asset: SwapAssetType;
  sellAmountHumanDecimal: string;
  /** The refund address, buying; the destination, selling. */
  address: string;
  requestedAtMs: number;
};
