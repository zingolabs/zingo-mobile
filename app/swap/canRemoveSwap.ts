import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { hasDepositEvidence } from './depositEvidence';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * Whether the user may delete a swap: only one where no money moved. An
 * expired or failed swap the provider never saw a deposit for, or a sale
 * whose ZEC never left the wallet. An awaited deposit expires on its own,
 * and a swap with a payment behind it stays, whatever its outcome, so funds
 * in motion are never hidden.
 */
export function canRemoveSwap(record: SwapRecordType): boolean {
  switch (record.status) {
    case SwapStatusEnum.PendingDeposit:
      return true;
    case SwapStatusEnum.Expired:
    case SwapStatusEnum.Failed:
      return !hasDepositEvidence(record);
    default:
      return false;
  }
}
