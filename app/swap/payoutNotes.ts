import type { ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/RPCValueTransfersStatusEnum';
import { SwapDirectionEnum } from './SwapDirectionEnum';
import { SwapStatusEnum } from './SwapStatusEnum';
import { normalizeHashForTrack } from './MidgardClient';
import { isThorchainFamily } from './thorchainFamily';
import type { SwapRecordType } from './SwapRecordType';

/** A payout this wallet received, with the source-chain hash its memo names. */
export type PayoutNoteType = {
  txid: string;
  /** ZEC, as the value transfer counts it. */
  amount: number;
  inboundHash: string;
};

/**
 * Maya and THORChain sign every payout `OUT:<inbound hash>`. A shielded one
 * carries it in the note's memo, which reaches the value transfer. A
 * transparent one carries it in an OP_RETURN zingolib does not hand over yet
 * (zingolib#3139).
 */
const PAYOUT_MEMO = /^OUT:([0-9a-f]{64})$/i;

export function payoutNotesFrom(
  valueTransfers: readonly ValueTransferType[],
): PayoutNoteType[] {
  return valueTransfers.flatMap(vt => {
    if (
      vt.kind !== ValueTransferKindEnum.Received ||
      vt.status === RPCValueTransfersStatusEnum.failed ||
      vt.swapRecordId
    ) {
      return [];
    }
    const hash = (vt.memos ?? [])
      .map(memo => PAYOUT_MEMO.exec(memo.trim())?.[1])
      .find((match): match is string => !!match);
    return hash
      ? [{ txid: vt.txid, amount: vt.amount, inboundHash: hash }]
      : [];
  });
}

/**
 * A Maya or THORChain purchase of ZEC whose payout has not been tied to it,
 * whatever the poller made of it so far: expired, failed or completed
 * without its payout. Only a refund, which went back, is out.
 */
export function awaitsPayout(record: SwapRecordType): boolean {
  return (
    record.direction === SwapDirectionEnum.Inbound &&
    isThorchainFamily(record.provider) &&
    record.receiveAsset.chain.toUpperCase() === 'ZEC' &&
    !record.destinationTxHash &&
    record.status !== SwapStatusEnum.Refunded
  );
}

/**
 * The record once the payout is its own: the deposit hash, the payout
 * transaction and the ZEC that reached the wallet. A Maya or THORChain
 * purchase pays out once, at the end, so the swap is complete. A refund goes
 * back to the source chain and never lands here.
 */
export function claimPayout(
  record: SwapRecordType,
  note: PayoutNoteType,
  nowMs: number,
): SwapRecordType {
  if (record.destinationTxHash) return record;
  return {
    ...record,
    observedDepositTxHash:
      record.observedDepositTxHash ??
      normalizeHashForTrack(note.inboundHash, record.sellAsset.chainId),
    destinationTxHash: note.txid,
    actualReceiveAmount: note.amount.toFixed(8),
    status: SwapStatusEnum.Completed,
    terminalAtMs:
      record.status === SwapStatusEnum.Completed
        ? (record.terminalAtMs ?? nowMs)
        : nowMs,
    updatedAtMs: nowMs,
  };
}
