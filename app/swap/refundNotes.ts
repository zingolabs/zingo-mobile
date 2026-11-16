import type { ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/wallet/enums';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { isThorchainFamily } from './thorchainFamily';
import type { SwapRecordType } from './types/SwapRecordType';

/** A refund this wallet received, with the Zcash deposit its memo names. */
export type RefundNoteType = {
  txid: string;
  /** ZEC, as the value transfer counts it. */
  amount: number;
  depositTxid: string;
};

/**
 * Maya and THORChain sign every refund `REFUND:<inbound hash>`, in a shielded
 * note's memo or in a transparent payment's OP_RETURN. On a sale the inbound
 * hash is the wallet's own Zcash deposit.
 */
const REFUND_MEMO = /^REFUND:([0-9a-f]{64})$/i;

export function refundNotesFrom(
  valueTransfers: readonly ValueTransferType[],
): RefundNoteType[] {
  return valueTransfers.flatMap(vt => {
    if (
      vt.kind !== ValueTransferKindEnum.Received ||
      vt.status === RPCValueTransfersStatusEnum.failed ||
      vt.swapRecordId
    ) {
      return [];
    }
    const hash = [...(vt.memos ?? []), ...(vt.opReturnData ?? [])]
      .map(text => REFUND_MEMO.exec(text.trim())?.[1])
      .find((match): match is string => !!match);
    return hash
      ? [{ txid: vt.txid, amount: vt.amount, depositTxid: hash.toLowerCase() }]
      : [];
  });
}

/** A Maya or THORChain sale of ZEC whose refund has not been tied to it. */
export function awaitsRefund(record: SwapRecordType): boolean {
  return (
    record.direction === SwapDirectionEnum.Outbound &&
    isThorchainFamily(record.provider) &&
    !record.refundInfo?.refundTxHash
  );
}

/** Whether the sale paid its deposit in the transaction a refund names. */
export function paidIn(record: SwapRecordType, txid: string): boolean {
  return [record.broadcast?.txId, ...(record.broadcast?.allTxIds ?? [])].some(
    deposit => deposit?.toLowerCase() === txid,
  );
}

/**
 * The record once the refund is its own: the refund transaction and the ZEC
 * that came back. A sale the provider completed keeps its status, since a
 * streaming swap can refund the part it could not fill.
 */
export function claimRefund(
  record: SwapRecordType,
  note: RefundNoteType,
  nowMs: number,
): SwapRecordType {
  if (record.refundInfo?.refundTxHash) return record;
  const completed = record.status === SwapStatusEnum.Completed;
  return {
    ...record,
    refundInfo: {
      ...record.refundInfo,
      refundTxHash: note.txid,
      refundedAmountText: note.amount.toFixed(8),
    },
    status: completed ? record.status : SwapStatusEnum.Refunded,
    terminalAtMs: completed ? (record.terminalAtMs ?? nowMs) : nowMs,
    updatedAtMs: nowMs,
  };
}
