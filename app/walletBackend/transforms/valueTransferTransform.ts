import {
  ValueTransferType,
  ValueTransferKindEnum,
  PoolEnum,
} from '../../AppState';
import { RPCValueTransferType } from '../types/RPCValueTransferType';
import { RPCValueTransfersKindEnum } from '../enums/RPCValueTransfersKindEnum';
import { RPCValueTransfersStatusEnum } from '../enums/RPCValueTransfersStatusEnum';

/**
 * An Orchard -> Ironwood migration is a send-to-self whose funding pools
 * include Orchard and whose received pools include Ironwood. zingolib does not
 * model migration as its own value-transfer kind (see its `send-to-self` doc:
 * `pools_sent_from: [Orchard]` + `pools_received: [Ironwood]`), so we derive it
 * here from the pool movement.
 */
function isOrchardToIronwoodMigration(vt: RPCValueTransferType): boolean {
  return (
    vt.kind === RPCValueTransfersKindEnum.sendToSelf &&
    !!vt.pools_sent_from?.includes(PoolEnum.OrchardPool) &&
    !!vt.pools_received?.includes(PoolEnum.IronwoodPool)
  );
}

/**
 * Maps a raw zingolib value transfer to the app's ValueTransferType.
 *
 * Pure function — no side effects, safe to call in `.map()`.
 *
 * Confirmation count is derived from block heights: server height is preferred
 * when it is ahead of the wallet height (mid-sync), otherwise wallet height is
 * used. Unconfirmed/mempool/failed transfers always get confirmations = 0.
 * Amounts and fees are converted from zats (integer) to ZEC (÷ 10^8).
 */
export function transformValueTransfer(
  vt: RPCValueTransferType,
  lastServerBlockHeight: number,
  lastWalletBlockHeight: number,
): ValueTransferType {
  const result: ValueTransferType = {} as ValueTransferType;

  result.txid = vt.txid;
  result.time = vt.datetime;
  result.kind = isOrchardToIronwoodMigration(vt)
    ? ValueTransferKindEnum.Migration
    : vt.kind === RPCValueTransfersKindEnum.memoToSelf
      ? ValueTransferKindEnum.MemoToSelf
      : vt.kind === RPCValueTransfersKindEnum.sendToSelf
        ? ValueTransferKindEnum.SendToSelf
        : vt.kind === RPCValueTransfersKindEnum.received
          ? ValueTransferKindEnum.Received
          : vt.kind === RPCValueTransfersKindEnum.sent
            ? ValueTransferKindEnum.Sent
            : vt.kind === RPCValueTransfersKindEnum.shield
              ? ValueTransferKindEnum.Shield
              : vt.kind === RPCValueTransfersKindEnum.rejection
                ? ValueTransferKindEnum.Rejection
                : vt.kind;
  result.fee = (!vt.transaction_fee ? 0 : vt.transaction_fee) / 10 ** 8;
  result.zecPrice = !vt.zec_price ? 0 : vt.zec_price;

  if (
    vt.status === RPCValueTransfersStatusEnum.calculated ||
    vt.status === RPCValueTransfersStatusEnum.transmitted ||
    vt.status === RPCValueTransfersStatusEnum.mempool ||
    vt.status === RPCValueTransfersStatusEnum.failed
  ) {
    result.confirmations = 0;
  } else if (vt.status === RPCValueTransfersStatusEnum.confirmed) {
    result.confirmations =
      lastServerBlockHeight && lastServerBlockHeight >= lastWalletBlockHeight
        ? lastServerBlockHeight - vt.blockheight + 1
        : lastWalletBlockHeight - vt.blockheight + 1;
  } else {
    // impossible case... I guess.
    result.confirmations = 0;
  }

  result.blockheight = vt.blockheight;
  result.status = vt.status;

  if (vt.status === RPCValueTransfersStatusEnum.failed) {
    console.log('[RPC] failed value transfer (raw):', vt);
  }
  result.address = !vt.recipient_address ? undefined : vt.recipient_address;
  result.amount = (!vt.value ? 0 : vt.value) / 10 ** 8;
  result.memos =
    !vt.memos || vt.memos.length === 0 || !vt.memos.join('')
      ? undefined
      : vt.memos;
  // `pools_received` is in protocol order (transparent, sapling, orchard,
  // ironwood); a transfer can span pools, and the app displays one, so
  // surface the newest pool present.
  result.poolType =
    !vt.pools_received || vt.pools_received.length === 0
      ? undefined
      : vt.pools_received[vt.pools_received.length - 1];

  if (result.status === RPCValueTransfersStatusEnum.failed) {
    console.log('[RPC] failed value transfer (transformed):', result);
  }

  return result;
}
