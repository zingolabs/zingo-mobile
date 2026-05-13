import { ValueTransferKindEnum, ValueTransferType } from '../../AppState';
import {
  RPCValueTransferType,
  RPCValueTransfersKindEnum,
  RPCValueTransfersStatusEnum,
} from '../types/rpcTransactionTypes';

export function transformRawValueTransfer(
  raw: RPCValueTransferType,
  lastServerBlockHeight: number,
  lastWalletBlockHeight: number,
): ValueTransferType {
  const vt: ValueTransferType = {} as ValueTransferType;

  vt.txid = raw.txid;
  vt.time = raw.datetime;
  vt.kind =
    raw.kind === RPCValueTransfersKindEnum.memoToSelf
      ? ValueTransferKindEnum.MemoToSelf
      : raw.kind === RPCValueTransfersKindEnum.sendToSelf
        ? ValueTransferKindEnum.SendToSelf
        : raw.kind === RPCValueTransfersKindEnum.received
          ? ValueTransferKindEnum.Received
          : raw.kind === RPCValueTransfersKindEnum.sent
            ? ValueTransferKindEnum.Sent
            : raw.kind === RPCValueTransfersKindEnum.shield
              ? ValueTransferKindEnum.Shield
              : raw.kind === RPCValueTransfersKindEnum.rejection
                ? ValueTransferKindEnum.Rejection
                : raw.kind;
  vt.fee = (raw.transaction_fee ?? 0) / 10 ** 8;
  vt.zecPrice = raw.zec_price ?? 0;

  if (
    raw.status === RPCValueTransfersStatusEnum.calculated ||
    raw.status === RPCValueTransfersStatusEnum.transmitted ||
    raw.status === RPCValueTransfersStatusEnum.mempool ||
    raw.status === RPCValueTransfersStatusEnum.failed
  ) {
    vt.confirmations = 0;
  } else if (raw.status === RPCValueTransfersStatusEnum.confirmed) {
    vt.confirmations =
      lastServerBlockHeight && lastServerBlockHeight >= lastWalletBlockHeight
        ? lastServerBlockHeight - raw.blockheight + 1
        : lastWalletBlockHeight - raw.blockheight + 1;
  } else {
    vt.confirmations = 0;
  }

  vt.blockheight = raw.blockheight;
  vt.status = raw.status;
  vt.address = raw.recipient_address ?? undefined;
  vt.amount = (raw.value ?? 0) / 10 ** 8;
  vt.memos =
    !raw.memos || raw.memos.length === 0 || !raw.memos.join('')
      ? undefined
      : raw.memos;
  vt.poolType = raw.pool_received ?? undefined;

  return vt;
}
