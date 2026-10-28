import { ValueTransferKindEnum } from '@app/AppState';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { transferIcon } from '@screens/History/transferIcon';
import { ShieldCheckIcon } from '@ui/primitives/Icons/ShieldCheckIcon';
import { TxMigrationIcon } from '@ui/primitives/Icons/TxMigrationIcon';
import { TxPendingIcon } from '@ui/primitives/Icons/TxPendingIcon';
import { TxReceivedIcon } from '@ui/primitives/Icons/TxReceivedIcon';
import { TxSelfIcon } from '@ui/primitives/Icons/TxSelfIcon';
import { TxSentIcon } from '@ui/primitives/Icons/TxSentIcon';

const at = (
  kind: ValueTransferKindEnum,
  confirmations: number,
  status = RPCValueTransfersStatusEnum.confirmed,
) => transferIcon({ kind, confirmations, status });

test('Tests that a confirmed transaction shows its kind icon when it has the wallet minimum of confirmations', () => {
  expect(at(ValueTransferKindEnum.Received, 3).icon).toBe(TxReceivedIcon);
  expect(at(ValueTransferKindEnum.Sent, 3).icon).toBe(TxSentIcon);
  expect(at(ValueTransferKindEnum.SendToSelf, 3).icon).toBe(TxSelfIcon);
  expect(at(ValueTransferKindEnum.MemoToSelf, 3).icon).toBe(TxSelfIcon);
  expect(at(ValueTransferKindEnum.Shield, 3).icon).toBe(ShieldCheckIcon);
  expect(at(ValueTransferKindEnum.Migration, 3).icon).toBe(TxMigrationIcon);
  expect(at(ValueTransferKindEnum.Sent, 3).danger).toBe(false);
});

test('Tests that a transaction shows the clock when it is in the mempool or confirming', () => {
  expect(at(ValueTransferKindEnum.Received, 0).icon).toBe(TxPendingIcon);
  expect(at(ValueTransferKindEnum.Shield, 2).icon).toBe(TxPendingIcon);
});

test('Tests that a transaction shows its kind icon in red when it failed or was rejected', () => {
  expect(
    at(ValueTransferKindEnum.Shield, 0, RPCValueTransfersStatusEnum.failed),
  ).toEqual({ icon: ShieldCheckIcon, danger: true });
  expect(at(ValueTransferKindEnum.Rejection, 3)).toEqual({
    icon: TxSentIcon,
    danger: true,
  });
});
