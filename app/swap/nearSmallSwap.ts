import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';

/**
 * Under this value, in dollars, NEAR Intents returns nothing sent by
 * mistake: the wrong coin, the wrong network. Known from NEAR's practice,
 * not from a published policy.
 */
export const NEAR_NO_REFUND_USD = 300;

/**
 * Whether the deposit the user is about to pay from another wallet is one
 * NEAR would keep on a mistake. A sale is paid by this wallet, so the coin
 * and the network cannot be wrong; an unpriced quote is left alone.
 */
export function nearRefusesSmallRefunds(args: {
  provider: SwapKitProviderEnum | undefined;
  direction: SwapDirectionEnum;
  sellUsd: number;
}): boolean {
  return (
    args.provider === SwapKitProviderEnum.Near &&
    args.direction === SwapDirectionEnum.Inbound &&
    Number.isFinite(args.sellUsd) &&
    args.sellUsd > 0 &&
    args.sellUsd < NEAR_NO_REFUND_USD
  );
}
