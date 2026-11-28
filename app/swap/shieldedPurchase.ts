import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { SwapKitHttpError } from './errors';

/**
 * Chains whose memo holds 80 bytes. Maya's memo to a unified address runs
 * past 110, so a purchase paid from one keeps the transparent destination.
 */
const SHORT_MEMO_CHAINS: readonly string[] = ['BTC', 'DASH'];

/**
 * Whether a purchase can be paid to a new unified address of this wallet.
 * NEAR takes one from any chain. Maya takes one when its memo fits.
 */
export function paysPurchaseShielded(args: {
  provider: SwapKitProviderEnum;
  direction: SwapDirectionEnum;
  sellChain: string;
}): boolean {
  return (
    args.direction === SwapDirectionEnum.Inbound &&
    (args.provider === SwapKitProviderEnum.Near ||
      (args.provider === SwapKitProviderEnum.MayachainStreaming &&
        chainCarriesShieldedPurchase(args.sellChain)))
  );
}

/**
 * Whether a sale's order names a new unified address for the refund. NEAR
 * takes one always. Maya takes one while mayanode has the shielded memo on.
 */
export function ordersShieldedRefund(args: {
  provider: SwapKitProviderEnum;
  direction: SwapDirectionEnum;
  shieldedMemoOn: boolean;
}): boolean {
  return (
    args.direction === SwapDirectionEnum.Outbound &&
    (args.provider === SwapKitProviderEnum.Near ||
      (args.provider === SwapKitProviderEnum.MayachainStreaming &&
        args.shieldedMemoOn))
  );
}

/**
 * Whether the route's ZEC lands shielded: a purchase paid to a unified
 * address, or a sale whose refund names one. Maya names it only while
 * mayanode has the shielded memo on.
 */
export function routeIsShielded(args: {
  provider: SwapKitProviderEnum;
  direction: SwapDirectionEnum;
  sellChain: string;
  shieldedMemoOn: boolean;
}): boolean {
  return args.direction === SwapDirectionEnum.Inbound
    ? paysPurchaseShielded(args)
    : ordersShieldedRefund(args);
}

/** The pool a provider pays a unified address in: NEAR pays Orchard, now Ironwood, and Maya pays Sapling. */
export function shieldedPool(
  provider: SwapKitProviderEnum,
): 'Ironwood' | 'Sapling' {
  return provider === SwapKitProviderEnum.Near ? 'Ironwood' : 'Sapling';
}

/** Whether a Maya purchase paid with this chain can land shielded. */
export function chainCarriesShieldedPurchase(sellChain: string): boolean {
  return !SHORT_MEMO_CHAINS.includes(sellChain.toUpperCase());
}

/**
 * Whether SwapKit refused an order for the address it names: a 4xx other
 * than the rate limit, or a destination too long for the memo. The same
 * route can still be ordered with the transparent address.
 */
export function refusesUnifiedAddress(error: unknown): boolean {
  return (
    isMemoTooLong(error) ||
    (error instanceof SwapKitHttpError &&
      error.httpStatus !== undefined &&
      error.httpStatus >= 400 &&
      error.httpStatus < 500 &&
      error.httpStatus !== 429)
  );
}

/** SwapKit's answer when the destination does not fit the source chain's memo. */
export function isMemoTooLong(error: unknown): boolean {
  return (
    error instanceof Error &&
    /too long for the source chain'?s memo/i.test(error.message)
  );
}

/**
 * The new unified address a swap made: where a purchase was paid, or a
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
