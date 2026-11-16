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
    chainCarriesShieldedPurchase(args.sellChain)
  );
}

/**
 * Whether the route's ZEC lands shielded: a purchase Maya pays to a unified
 * address, or a Maya sale whose shielded memo names a unified address for the
 * refund. That memo exists only while mayanode has it on.
 */
export function routeIsShielded(args: {
  provider: SwapKitProviderEnum;
  direction: SwapDirectionEnum;
  sellChain: string;
  shieldedMemoOn: boolean;
}): boolean {
  return args.direction === SwapDirectionEnum.Inbound
    ? paysPurchaseShielded(args)
    : args.provider === SwapKitProviderEnum.MayachainStreaming &&
        args.shieldedMemoOn;
}

/** Whether a purchase paid with this chain can land shielded on any route. */
export function chainCarriesShieldedPurchase(sellChain: string): boolean {
  return !SHORT_MEMO_CHAINS.includes(sellChain.toUpperCase());
}

/** SwapKit's answer when the destination does not fit the source chain's memo. */
export function isMemoTooLong(error: unknown): boolean {
  return (
    error instanceof Error &&
    /too long for the source chain'?s memo/i.test(error.message)
  );
}

/**
 * The new unified address a Maya swap made: where a purchase was paid, or a
 * sale's refund. A swap that kept a transparent address made none.
 */
export function swapAddressOf(record: {
  direction: SwapDirectionEnum;
  destinationAddress: string;
  refundAddress?: string;
}): string | undefined {
  return record.direction === SwapDirectionEnum.Inbound
    ? record.destinationAddress.startsWith('u1')
      ? record.destinationAddress
      : undefined
    : record.refundAddress;
}
