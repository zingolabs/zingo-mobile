import { GlobalConst, ValueTransferType } from '@app/AppState';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import type { SendStage } from '@app/walletBackend/transforms/sendSettlement';

/** The five steps a send is told in, with its dots. */
export const STEPS = ['build', 'nym', 'pool', 'conf', 'done'] as const;
export type SendStep = (typeof STEPS)[number];

/** Where a send stopped; `expired` failed after it went out. */
export type FailStage = SendStage | 'expired';

/**
 * What the sending screen shows: a step and the transactions it follows,
 * or where it failed, with the transactions that failed and the ones that
 * went on (a TEX send whose payment failed after its hop went out).
 */
export type SendView =
  | {
      kind: 'progress';
      step: SendStep;
      confirmations: number;
      rows: ValueTransferType[];
    }
  | {
      kind: 'failed';
      stage: FailStage;
      rows: ValueTransferType[];
      partial: boolean;
    };

/** The kinds a send or a shield of this wallet leaves in History. */
const OWN: readonly ValueTransferKindEnum[] = [
  ValueTransferKindEnum.Sent,
  ValueTransferKindEnum.SendToSelf,
  ValueTransferKindEnum.MemoToSelf,
  ValueTransferKindEnum.Shield,
];

const isFailed = (vt: ValueTransferType) =>
  vt.status === RPCValueTransfersStatusEnum.failed;
/** In a TEX send the hop to oneself goes first, the payment last. */
const isPayment = (vt: ValueTransferType) =>
  vt.kind === ValueTransferKindEnum.Sent;

/** A send or a shield of this wallet that History should reopen here: not failed and still confirming. */
export const followsHere = (vt: ValueTransferType): boolean =>
  OWN.includes(vt.kind) &&
  !isFailed(vt) &&
  vt.confirmations < GlobalConst.minConfirmations;

/**
 * A send that went out, followed by its txids: through NYM until every one
 * is listed and past `transmitted`, in the mempool until all are mined, then
 * confirming by the least confirmed one. One that fails on the way says so.
 */
export function followTxids(
  txids: string[],
  valueTransfers: ValueTransferType[],
): SendView {
  const rows = txids.flatMap(txid => {
    const vt = valueTransfers.find(v => v.txid === txid);
    return vt ? [vt] : [];
  });
  const lost = rows.filter(isFailed);
  if (lost.length > 0) {
    return {
      kind: 'failed',
      stage: 'expired',
      rows,
      partial: lost.length < txids.length,
    };
  }
  const progress = (step: SendStep, confirmations = 0): SendView => ({
    kind: 'progress',
    step,
    confirmations,
    rows,
  });
  if (txids.length === 0) {
    return progress('done');
  }
  if (
    rows.length < txids.length ||
    rows.some(
      vt =>
        vt.status === RPCValueTransfersStatusEnum.calculated ||
        vt.status === RPCValueTransfersStatusEnum.transmitted,
    )
  ) {
    return progress('nym');
  }
  const least = Math.min(...rows.map(vt => vt.confirmations));
  return least === 0
    ? progress('pool')
    : least < GlobalConst.minConfirmations
      ? progress('conf', least)
      : progress('done', least);
}

/**
 * A send that failed at `stage`: created and failed, its transactions are
 * this wallet's failed rows since its attempt began (a TEX hop that went out
 * stays among them, and makes it partial). Failed while creating, there are
 * none.
 */
export function failedSince(
  stage: SendStage,
  since: number,
  valueTransfers: ValueTransferType[],
): SendView {
  const rows =
    stage === 'create'
      ? []
      : valueTransfers
          .filter(vt => OWN.includes(vt.kind) && vt.time >= since)
          .sort(
            (a, b) =>
              a.time - b.time || Number(isPayment(a)) - Number(isPayment(b)),
          );
  const lost = rows.filter(isFailed);
  return {
    kind: 'failed',
    stage,
    rows,
    partial: lost.length > 0 && lost.length < rows.length,
  };
}
