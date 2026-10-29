import { SwapKitProviderEnum } from './enums/SwapKitProviderEnum';
import { SwapRecordType } from './types/SwapRecordType';

/** What a sale's deposit asks the wallet to send. */
export type SaleDepositRequestType = {
  depositAddress: string;
  amountAtomic: number;
  memoBytes?: Uint8Array;
  viaSourceAddress?: boolean;
  shieldedMemoAddress?: string;
};

/**
 * The deposit of a sale whose ZEC did not leave, rebuilt from its record the
 * way the first send built it from the instructions. The source-address rule
 * is the one kept at commit; a record from before it was kept falls back to
 * what the providers ask: Flashnet always, a memo-carrying provider when it
 * has a memo.
 */
export function saleDepositRequest(
  record: SwapRecordType,
): SaleDepositRequestType {
  const { memo, shieldedMemoAddress } = record.providerData as {
    memo?: string;
    shieldedMemoAddress?: string;
  };
  return {
    depositAddress: record.depositAddress,
    amountAtomic: Math.round(parseFloat(record.sellAmountHumanDecimal) * 1e8),
    memoBytes: memo ? new TextEncoder().encode(memo) : undefined,
    viaSourceAddress:
      record.depositFromSourceAddress ??
      (record.provider === SwapKitProviderEnum.Flashnet || !!memo),
    shieldedMemoAddress,
  };
}
