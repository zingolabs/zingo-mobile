import ValueTransferType from '@app/AppState/types/ValueTransferType';
import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';
import { SwapStatusEnum, isTerminalStatus } from './enums/SwapStatusEnum';
import { SwapDirectionEnum } from './enums/SwapDirectionEnum';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * Projects a `SwapRecordType` into a `ValueTransferType` row, so the History
 * list renders it beside zingolib's transfers.
 *
 * The list keys on `txid`. An outbound swap with a broadcast uses its deposit
 * txid; an inbound or pre-broadcast record falls back to the deposit address,
 * which never collides with a real txid.
 *
 * The swap is not deduplicated against the Sent transfer that paid its
 * deposit: the user sees both rows, so zingolib's transaction stays visible.
 */
export function swapRecordToValueTransfer(
  record: SwapRecordType,
): ValueTransferType {
  const txid =
    record.broadcast?.txId ??
    record.observedDepositTxHash ??
    record.depositAddress;
  const isInbound = record.direction === SwapDirectionEnum.Inbound;
  // The row shows the side that is not ZEC, whichever direction the swap
  // runs. The ZEC leg has its own row beside this one: the deposit this wallet
  // broadcast for an outbound swap, the payout it received for an inbound one.
  // An outbound swap still moving carries the quote-time estimate, since the
  // provider has reported no payout yet. The status label says so.
  const counterpartyAsset = isInbound ? record.sellAsset : record.receiveAsset;
  const displayAmountStr = isInbound
    ? record.sellAmountHumanDecimal
    : (record.actualReceiveAmount ?? record.expectedReceiveAmount);
  const displayAmount = parseFloat(displayAmountStr);
  // Captured when the route was quoted, so the figure is what the swap was
  // worth when it ran. Zero means SwapKit priced neither side, and the row
  // hides the column at zero.
  const counterpartyUsdUnitPrice = isInbound
    ? record.fiatValueBasis.sellUsdUnitPrice
    : record.fiatValueBasis.receiveUsdUnitPrice;

  return {
    txid,
    kind: ValueTransferKindEnum.Swap,
    fee: undefined,
    // A multi-step swap has no single confirmation count. Zero reads as in
    // progress in the row; the detail reads the per-transaction figures.
    confirmations: isTerminalStatus(record.status) ? 1 : 0,
    blockheight: 0,
    time: Math.floor(record.createdAtMs / 1000),
    zecPrice: undefined,
    address: record.destinationAddress,
    amount: Number.isFinite(displayAmount) ? displayAmount : 0,
    memos: undefined,
    poolType: undefined,
    status: mapSwapStatusToVTStatus(record.status),
    swapRecordId: record.recordId,
    swapIsInbound: isInbound,
    swapStatus: record.status,
    swapAssetTicker: counterpartyAsset.ticker ?? counterpartyAsset.symbol,
    swapUsdUnitPrice: counterpartyUsdUnitPrice,
    swapProvider: record.provider,
  };
}

/**
 * The row's colour and icon come from the transfer status, which has five
 * values to the swap's ten. `IncompleteDeposit` stays in flight: the provider
 * holds the funds and either refunds or accepts a top-up.
 */
function mapSwapStatusToVTStatus(
  status: SwapStatusEnum,
): RPCValueTransfersStatusEnum {
  switch (status) {
    case SwapStatusEnum.Completed:
      return RPCValueTransfersStatusEnum.confirmed;
    case SwapStatusEnum.Failed:
    case SwapStatusEnum.Refunded:
    case SwapStatusEnum.Expired:
      return RPCValueTransfersStatusEnum.failed;
    case SwapStatusEnum.PendingDeposit:
    case SwapStatusEnum.AwaitingExternalDeposit:
      return RPCValueTransfersStatusEnum.calculated;
    case SwapStatusEnum.IncompleteDeposit:
    case SwapStatusEnum.Pending:
    case SwapStatusEnum.Processing:
    case SwapStatusEnum.ProviderStatusUnknown:
    default:
      return RPCValueTransfersStatusEnum.mempool;
  }
}

/** Whether the swap sold this wallet's ZEC, which the Sent filter counts. */
export function isOutboundSwap(record: SwapRecordType): boolean {
  return record.direction === SwapDirectionEnum.Outbound;
}
