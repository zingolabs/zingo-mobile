import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';

/**
 * Chains whose memo holds 80 bytes. Maya's memo to a unified address runs
 * past 110, so a purchase paid from one keeps the transparent destination.
 */
const SHORT_MEMO_CHAINS: readonly string[] = ['BTC', 'DASH'];

/**
 * Whether a purchase can ask Maya to pay a unified address of this wallet,
 * which lands the ZEC shielded. Only Maya takes one: the other providers
 * build no route to it.
 */
export function paysPurchaseShielded(args: {
  provider: SwapKitProviderEnum;
  direction: SwapDirectionEnum;
  sellChain: string;
}): boolean {
  return (
    args.direction === SwapDirectionEnum.Inbound &&
    args.provider === SwapKitProviderEnum.MayachainStreaming &&
    !SHORT_MEMO_CHAINS.includes(args.sellChain.toUpperCase())
  );
}

/** SwapKit's answer when the destination does not fit the source chain's memo. */
export function isMemoTooLong(error: unknown): boolean {
  return (
    error instanceof Error &&
    /too long for the source chain'?s memo/i.test(error.message)
  );
}
