/** One fee SwapKit reports for a settled swap, in its own asset. */
export type SettledFeeType = { type?: string; amount?: string; asset?: string };

/**
 * What a swap cost once it settled, as `/track` reports it: the fees charged
 * and the USD values SwapKit gives the input and the output at that time.
 */
export type SettledCostType = {
  fees: ReadonlyArray<SettledFeeType>;
  inUsd: number;
  outUsd: number;
};
