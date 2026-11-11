import { formatAmountForDisplay } from '@app/swap';
import type {
  FiatValueBasisType,
  QuoteInput,
  RouteOptionType,
} from '@app/swap';
import { formatPercent, formatUsd } from '@app/utils/formatAmount';

/**
 * A route's fees as a share of what is sold, with its dollars; the amount
 * when no share can be told. Review and the swap screen say it the same way.
 */
export function routeFeeValue(args: {
  route: RouteOptionType;
  quoteInput: QuoteInput;
  fiatValueBasis: FiatValueBasisType;
  isOutbound: boolean;
}): string {
  const { route, quoteInput, fiatValueBasis, isOutbound } = args;
  const sellSymbol = quoteInput.sellAsset.ticker ?? quoteInput.sellAsset.symbol;
  const receiveSymbol =
    quoteInput.receiveAsset.ticker ?? quoteInput.receiveAsset.symbol;
  const feeText = isOutbound
    ? route.totalFeesInSellAsset
      ? `${formatAmountForDisplay(route.totalFeesInSellAsset)} ${sellSymbol}`
      : '—'
    : route.totalFeesInReceiveAsset
      ? `${formatAmountForDisplay(route.totalFeesInReceiveAsset)} ${receiveSymbol}`
      : '—';

  const sellAmount = parseFloat(quoteInput.sellAmountHumanDecimal);
  const feesInSell = parseFloat(route.totalFeesInSellAsset ?? '');
  const feesInReceive = parseFloat(route.totalFeesInReceiveAsset ?? '');
  const receiveAmount = parseFloat(route.expectedReceiveAmount);
  const feeShare = Number.isFinite(feesInSell)
    ? feesInSell / sellAmount
    : Number.isFinite(feesInReceive)
      ? feesInReceive / (receiveAmount + feesInReceive)
      : NaN;
  const feeUsd = Number.isFinite(feesInSell)
    ? feesInSell * fiatValueBasis.sellUsdUnitPrice
    : feesInReceive * fiatValueBasis.receiveUsdUnitPrice;
  return Number.isFinite(feeShare)
    ? [
        `${formatPercent(feeShare * 100)}%`,
        Number.isFinite(feeUsd) && feeUsd > 0 ? `≈ ${formatUsd(feeUsd)}` : '',
      ]
        .filter(Boolean)
        .join(' · ')
    : feeText;
}
