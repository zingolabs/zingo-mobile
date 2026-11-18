import type { SwapRecordType } from './types/SwapRecordType';
import type { TrackResponseType } from './types/TrackResponseType';
import type { SettledCostType } from './types/SettledCostType';

const usdOf = (value: unknown): number => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** The settled cost in a `/track` response, or undefined when it carries none. */
export function settledCostFrom(
  response: TrackResponseType,
): SettledCostType | undefined {
  const meta = response.meta ?? {};
  const inUsd = usdOf(meta.amountInUsd);
  const outUsd = usdOf(meta.amountOutUsd);
  if (inUsd === 0 || outUsd === 0) return undefined;
  const fees = Array.isArray(meta.fees)
    ? (meta.fees as ReadonlyArray<Record<string, unknown>>).map(fee => ({
        type: typeof fee.type === 'string' ? fee.type : undefined,
        amount: typeof fee.amount === 'string' ? fee.amount : undefined,
        asset: typeof fee.asset === 'string' ? fee.asset : undefined,
      }))
    : [];
  return { fees, inUsd, outUsd };
}

/** The USD each unit of the input and the output was worth when the swap settled. */
function settledUnitPrices(
  record: SwapRecordType,
  cost: SettledCostType,
): { sell: number; receive: number } {
  const sold = parseFloat(record.sellAmountHumanDecimal);
  const got = parseFloat(
    record.actualReceiveAmount ?? record.expectedReceiveAmount,
  );
  return {
    sell: sold > 0 ? cost.inUsd / sold : 0,
    receive: got > 0 ? cost.outUsd / got : 0,
  };
}

/**
 * The fees a settled swap was charged, in USD at the settled prices. A fee in
 * an asset that is neither side of the swap has no price here and is left out.
 */
export function settledFeesUsd(
  record: SwapRecordType,
  cost: SettledCostType,
): number {
  const prices = settledUnitPrices(record, cost);
  const same = (a: string | undefined, b: string) =>
    !!a && a.toUpperCase() === b.toUpperCase();
  return cost.fees.reduce((sum, fee) => {
    const amount = parseFloat(fee.amount ?? '');
    if (!Number.isFinite(amount)) return sum;
    if (same(fee.asset, record.sellAsset.swapKitId)) {
      return sum + amount * prices.sell;
    }
    if (same(fee.asset, record.receiveAsset.swapKitId)) {
      return sum + amount * prices.receive;
    }
    return sum;
  }, 0);
}

/**
 * What the input was worth: SwapKit's settled value once the swap settled,
 * the quote's price before that.
 */
export function inputUsd(record: SwapRecordType): number {
  if (record.settledCost) return record.settledCost.inUsd;
  const v =
    parseFloat(record.sellAmountHumanDecimal) *
    record.fiatValueBasis.sellUsdUnitPrice;
  return Number.isFinite(v) && v > 0 ? v : 0;
}
