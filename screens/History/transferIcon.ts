import { GlobalConst, ValueTransferKindEnum } from '@app/AppState';
import type { ValueTransferType } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { ShieldCheckIcon } from '@ui/primitives/Icons/ShieldCheckIcon';
import { TxMigrationIcon } from '@ui/primitives/Icons/TxMigrationIcon';
import { TxPendingIcon } from '@ui/primitives/Icons/TxPendingIcon';
import { TxReceivedIcon } from '@ui/primitives/Icons/TxReceivedIcon';
import { TxSelfIcon } from '@ui/primitives/Icons/TxSelfIcon';
import { TxSentIcon } from '@ui/primitives/Icons/TxSentIcon';

type IconComponent = typeof TxSentIcon;

/** The drawing of a transaction's kind, once it is confirmed. */
function kindIcon(kind: ValueTransferKindEnum): IconComponent {
  switch (kind) {
    case ValueTransferKindEnum.Received:
      return TxReceivedIcon;
    case ValueTransferKindEnum.Shield:
      return ShieldCheckIcon;
    case ValueTransferKindEnum.Migration:
      return TxMigrationIcon;
    case ValueTransferKindEnum.SendToSelf:
    case ValueTransferKindEnum.MemoToSelf:
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
  const failed = vt.status === RPCValueTransfersStatusEnum.failed;
  if (failed || vt.kind === ValueTransferKindEnum.Rejection) {
    return { icon: kindIcon(vt.kind), danger: true };
  }
  if (vt.confirmations < GlobalConst.minConfirmations) {
    return { icon: TxPendingIcon, danger: false };
  }
  return { icon: kindIcon(vt.kind), danger: false };
}
