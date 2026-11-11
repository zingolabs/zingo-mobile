import { GlobalConst } from '@app/AppState';
import type { ValueTransferType } from '@app/wallet/transfer';
import { ValueTransferStatus } from '@app/wallet/transfer';

/** The word for each status before it is mined, as zingolib reports it. */
const PENDING: Partial<Record<ValueTransferStatus, string>> = {
  calculated: 'history.state-prepared',
  transmitted: 'history.state-sending',
  mempool: 'history.in-mempool',
};

/**
 * Where a transaction stands, as its detail's pill says it: failed, the
 * status zingolib reports until it is mined, confirming up to the wallet's
 * minimum, or confirmed. Only a transaction zingolib saw in the mempool says
 * so: a calculated or transmitted one may never have reached the network.
 */
export function transferStatus(
  vt: Pick<ValueTransferType, 'status' | 'confirmations'>,
  t: (key: string) => string,
): { text: string; tone: 'danger' | 'warning' | 'accent' } {
  if (vt.status === 'failed') {
    return { text: t('history.state-failed'), tone: 'danger' };
  }
  const pending = PENDING[vt.status];
  if (pending) {
    return { text: t(pending), tone: 'warning' };
  }
  if (vt.confirmations < GlobalConst.minConfirmations) {
    return {
      text: t('history.confirming')
        .replace('{n}', String(vt.confirmations))
        .replace('{of}', String(GlobalConst.minConfirmations)),
      tone: 'warning',
    };
  }
  return { text: t('swap.tx-confirmed'), tone: 'accent' };
}
