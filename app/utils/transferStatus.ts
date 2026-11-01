import { GlobalConst } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

/**
 * Where a transaction stands, as its detail's pill says it: failed, in the
 * mempool, confirming up to the wallet's minimum, or confirmed. One block is
 * not enough: below the minimum it reads as confirming, n of the minimum.
 */
export function transferStatus(
  vt: Pick<ValueTransferType, 'status' | 'confirmations'>,
  t: (key: string) => string,
): { text: string; tone: 'danger' | 'warning' | 'accent' } {
  if (vt.status === RPCValueTransfersStatusEnum.failed) {
    return { text: t('history.state-failed'), tone: 'danger' };
  }
  if (vt.confirmations === 0) {
    return { text: t('history.in-mempool'), tone: 'warning' };
  }
  if (vt.confirmations > 0 && vt.confirmations < GlobalConst.minConfirmations) {
    return {
      text: t('history.confirming')
        .replace('{n}', String(vt.confirmations))
        .replace('{of}', String(GlobalConst.minConfirmations)),
      tone: 'warning',
    };
  }
  return { text: t('swap.tx-confirmed'), tone: 'accent' };
}
