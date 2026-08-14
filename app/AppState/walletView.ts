// WalletView — the total render projection (ADR 0005). One of four outcomes,
// chosen from observed data only: the in-flight command and the stalled
// predicate never enter the selection. This is the pure port of the
// four-outcome selector that lived inline in the LoadedApp render prop
// (LoadedApp.tsx render, the HomeStack body). It reads no clock and holds no
// state, so a unit test drives it directly.
//
// `somePending` is derived here from the value-transfer data, not read from an
// imperatively-set flag, so the selector depends on observed data alone.

import { ModeEnum } from './enums/ModeEnum';
import { SelectServerEnum } from './enums/SelectServerEnum';
import type TotalBalanceClass from './classes/TotalBalanceClass';
import type ValueTransferType from './types/ValueTransferType';
import { GlobalConst } from './const/GlobalConst';
import { RPCValueTransfersStatusEnum } from '../walletBackend/enums/RPCValueTransfersStatusEnum';

export type WalletView =
  | 'spinner'
  | 'receiveOnly'
  | 'fullWithSend'
  | 'fullWithoutSend';

// The fields WalletView reads, and only those.
export type WalletViewSource = {
  mode: ModeEnum;
  readOnly: boolean;
  selectServer: SelectServerEnum;
  totalBalance: TotalBalanceClass | null;
  valueTransfers: ValueTransferType[] | null;
  valueTransfersTotal: number | null;
  addresses: readonly unknown[] | null;
};

// A transfer is pending while it is not failed and not yet past the confirmation
// threshold. `count > 0` from the original predicate is exactly `.some(...)`.
export const somePendingFrom = (
  valueTransfers: ValueTransferType[] | null,
): boolean =>
  !!valueTransfers &&
  valueTransfers.some(
    vt =>
      vt.status !== RPCValueTransfersStatusEnum.failed &&
      vt.confirmations >= 0 &&
      vt.confirmations < GlobalConst.minConfirmations,
  );

export const selectWalletView = (src: WalletViewSource): WalletView => {
  const { totalBalance: bal } = src;

  const spendableShielded =
    !!bal && bal.confirmedOrchardBalance + bal.confirmedSaplingBalance > 0;

  const full =
    src.mode === ModeEnum.advanced ||
    (src.valueTransfersTotal !== null && src.valueTransfersTotal > 0) ||
    (!src.readOnly && spendableShielded);

  if (!full) {
    return src.addresses === null ? 'spinner' : 'receiveOnly';
  }

  const hasConfirmedShielded =
    !!bal &&
    bal.confirmedIronwoodBalance +
      bal.confirmedOrchardBalance +
      bal.confirmedSaplingBalance >
      0;

  const hasFullyUnconfirmedShieldedPool =
    !!bal &&
    ((bal.totalIronwoodBalance > 0 && bal.confirmedIronwoodBalance === 0) ||
      (bal.totalOrchardBalance > 0 && bal.confirmedOrchardBalance === 0) ||
      (bal.totalSaplingBalance > 0 && bal.confirmedSaplingBalance === 0));

  const showSend =
    !src.readOnly &&
    src.selectServer !== SelectServerEnum.offline &&
    (src.mode === ModeEnum.advanced ||
      hasConfirmedShielded ||
      (hasFullyUnconfirmedShieldedPool && somePendingFrom(src.valueTransfers)));

  return showSend ? 'fullWithSend' : 'fullWithoutSend';
};
