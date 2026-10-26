import { formatAmount, formatExactAmount } from '@app/utils/formatAmount';

import type { FiatValueBasisType } from './types/FiatValueBasisType';

/**
 * How a fee quoted in one asset was expressed in another.
 *
 * `identity` means no conversion was needed. `converted` carries both the
 * converted figure and the original, so the detail view can show what the
 * provider actually charged. `unconvertible` keeps only the original: without
 * a price for both sides, inventing a converted number would be a guess
 * presented as a fact.
 */
export type FeeConversionType =
  | { kind: 'identity'; amountInTarget: number }
  | {
      kind: 'converted';
      amountInTarget: number;
      originalAmount: string;
      originalAsset: string;
    }
  | {
      kind: 'unconvertible';
      originalAmount: string;
      originalAsset: string;
    };

export function convertFeeToAsset(args: {
  fee: { amount?: string; asset?: string };
  targetAssetId: string;
  sellAssetId: string;
  receiveAssetId: string;
  fiatBasis: FiatValueBasisType | null;
}): FeeConversionType {
  const { fee, targetAssetId, sellAssetId, receiveAssetId, fiatBasis } = args;
  const amount = parseFloat(fee.amount ?? '0');
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const sourceAssetId = fee.asset ?? '';

  if (sourceAssetId === targetAssetId) {
    return { kind: 'identity', amountInTarget: safeAmount };
  }

  // Bridge through USD. Only works when both the fee's own asset and the
  // target asset have a price in `fiatBasis`.
  const sourcePriceUsd =
    sourceAssetId === sellAssetId
      ? fiatBasis?.sellUsdUnitPrice
      : sourceAssetId === receiveAssetId
        ? fiatBasis?.receiveUsdUnitPrice
        : undefined;
  const targetPriceUsd =
    targetAssetId === sellAssetId
      ? fiatBasis?.sellUsdUnitPrice
      : targetAssetId === receiveAssetId
        ? fiatBasis?.receiveUsdUnitPrice
        : undefined;
  if (
    sourcePriceUsd !== undefined &&
    sourcePriceUsd > 0 &&
    targetPriceUsd !== undefined &&
    targetPriceUsd > 0
  ) {
    return {
      kind: 'converted',
      amountInTarget: (safeAmount * sourcePriceUsd) / targetPriceUsd,
      originalAmount: fee.amount ?? '0',
      originalAsset: assetShortLabel(sourceAssetId),
    };
  }
  return {
    kind: 'unconvertible',
    originalAmount: fee.amount ?? '0',
    originalAsset: assetShortLabel(sourceAssetId),
  };
}

/**
 * A fee amount in the app's amount format (`formatAmount`): never more than
 * 8 decimals, a zatoshi, the smallest thing any asset here is quoted in;
 * past it the digits are the provider's arithmetic rather than money anyone
 * holds.
 *
 * Accepts the provider's string as readily as a number, because a fee reaches
 * this both converted (a number) and verbatim (an 18-decimal ERC20 string that
 * would otherwise reach the screen in full).
 *
 * Empty, unparseable and non-finite values read as zero.
 */
export function formatFeeAmount(amount: number | string | undefined): string {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (value === undefined || !Number.isFinite(value) || value === 0) {
    return formatAmount(0);
  }
  // A fee smaller than the last place shown is still a fee. Printing zero for
  // it would read as no fee at all, so it reads as under the threshold, the
  // way the wallet already writes a sub-cent USD figure.
  return Math.abs(value) < 1e-8
    ? `< ${formatExactAmount('0.00000001')}`
    : formatAmount(value);
}

/**
 * The symbol out of a SwapKit asset id, whose shape is
 * `CHAIN.SYMBOL[-CONTRACT]`.
 */
export function assetShortLabel(asset: string): string {
  const afterDot = asset.includes('.')
    ? asset.slice(asset.indexOf('.') + 1)
    : asset;
  const dashIdx = afterDot.indexOf('-');
  return dashIdx >= 0 ? afterDot.slice(0, dashIdx) : afterDot;
}
