import { ValueTransfer } from 'zingo-ffi';
import { ValueTransferType } from '@app/AppState';
import { zats } from '@app/walletBackend/ffi';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import {
  poolName,
  transferKind,
  transferStatus,
} from '@app/walletBackend/transforms/enumTransform';

const ZATS_PER_ZEC = 10 ** 8;

/**
 * Maps a wallet value transfer to the app's ValueTransferType, counting
 * confirmations from whichever of the server and wallet heights is ahead.
 */
export function transformValueTransfer(
  vt: ValueTransfer,
  lastServerBlockHeight: number,
  lastWalletBlockHeight: number,
): ValueTransferType {
  const status = transferStatus(vt.status);
  const tip =
    lastServerBlockHeight && lastServerBlockHeight >= lastWalletBlockHeight
      ? lastServerBlockHeight
      : lastWalletBlockHeight;
  const confirmations =
    status === RPCValueTransfersStatusEnum.confirmed
      ? tip - vt.blockheight + 1
      : 0;
  const memos = vt.memos.join('') ? vt.memos : undefined;
  const newestPool = vt.poolsReceived[vt.poolsReceived.length - 1];
  return {
    txid: vt.txid,
    time: vt.datetime,
    kind: transferKind(vt.kind),
    fee: zats(vt.transactionFee) / ZATS_PER_ZEC,
    zecPrice: vt.zecPrice ?? 0,
    confirmations,
    blockheight: vt.blockheight,
    status,
    address: vt.recipientAddress,
    amount: zats(vt.value) / ZATS_PER_ZEC,
    memos,
    poolType: newestPool === undefined ? undefined : poolName(newestPool),
  };
}
