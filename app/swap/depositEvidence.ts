import { BroadcastStatusEnum } from './enums/BroadcastStatusEnum';
import { isRealLegHash } from './providers/trackUpdateBase';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * Whether the provider can already see a deposit for this swap.
 *
 * Outbound gets its evidence from our own broadcast bookkeeping; inbound from
 * the source-chain hash, which reaches the record either from the user or from
 * Midgard. `isRealLegHash` rather than a truthiness check because `/track`
 * emits an all-zero placeholder for a leg that has not landed, and a record
 * written before that filter existed can still be carrying one.
 */
export function hasDepositEvidence(record: SwapRecordType): boolean {
  if (record.broadcast?.status === BroadcastStatusEnum.Broadcasted) return true;
  return isRealLegHash(record.observedDepositTxHash);
}
