import { GlobalConst } from '@app/AppState';
import { ValueTransferKind } from '@app/wallet/transfer';
import type { ValueTransferType } from '@app/wallet/transfer';
import { ShieldCheckIcon } from '@ui/primitives/Icons/ShieldCheckIcon';
import { TxMigrationIcon } from '@ui/primitives/Icons/TxMigrationIcon';
import { TxPendingIcon } from '@ui/primitives/Icons/TxPendingIcon';
import { TxReceivedIcon } from '@ui/primitives/Icons/TxReceivedIcon';
import { TxSelfIcon } from '@ui/primitives/Icons/TxSelfIcon';
import { TxSentIcon } from '@ui/primitives/Icons/TxSentIcon';

type IconComponent = typeof TxSentIcon;

/** The drawing of a transaction's kind, once it is confirmed. */
function kindIcon(kind: ValueTransferKind): IconComponent {
  switch (kind) {
    case 'Received':
      return TxReceivedIcon;
    case 'Shield':
      return ShieldCheckIcon;
    case 'Migration':
      return TxMigrationIcon;
    case 'SendToSelf':
    case 'MemoToSelf':
      return TxSelfIcon;
    default:
      return TxSentIcon;
  }
}

/**
 * A History row's icon when no contact stands for it: the clock while the
 * transaction is in the mempool or confirming, its kind's icon once
 * confirmed, in red when it failed or was rejected.
 */
export function transferIcon(
  vt: Pick<ValueTransferType, 'kind' | 'status' | 'confirmations'>,
): { icon: IconComponent; danger: boolean } {
  const failed = vt.status === 'failed';
  if (failed || vt.kind === 'Rejection') {
    return { icon: kindIcon(vt.kind), danger: true };
  }
  if (vt.confirmations < GlobalConst.minConfirmations) {
    return { icon: TxPendingIcon, danger: false };
  }
  return { icon: kindIcon(vt.kind), danger: false };
}
