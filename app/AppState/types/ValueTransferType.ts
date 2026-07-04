import { ValueTransferKindEnum } from '../enums/ValueTransferKindEnum';
import { PoolEnum } from '../enums/PoolEnum';
import { RPCValueTransfersStatusEnum } from '../../walletBackend/enums/RPCValueTransfersStatusEnum';
import { SwapStatusEnum } from '../../swap/enums/SwapStatusEnum';

export default interface ValueTransferType {
  txid: string;
  kind: ValueTransferKindEnum;
  fee?: number;
  confirmations: number;
  blockheight: number;
  time: number;
  zecPrice?: number;
  address?: string;
  amount: number;
  memos?: string[];
  poolType?: PoolEnum;
  status: RPCValueTransfersStatusEnum;
  /**
   * Local primary key of the originating `SwapRecord` when this VT is a
   * projection of a swap (kind === Swap). Set by `swapRecordToValueTransfer`
   * so the History row's tap handler can navigate to SwapDetail by recordId
   * — avoids re-matching the SwapRecord by txid (brittle because
   * `txid` here falls back to `depositAddress` when no hash exists, which
   * could now collide across records after the PK refactor). Undefined for
   * every other VT kind.
   */
  swapRecordId?: string;
  /**
   * Direction marker for swap-kind projections so the History row can
   * mirror the look of a normal Sent (outbound) vs Received (inbound)
   * row — inbound swaps colour the amount in `colors.primary` like a
   * Received row, outbound stays in `colors.text` like a Sent row.
   * Undefined for every non-swap VT kind.
   */
  swapIsInbound?: boolean;
  /**
   * Original `SwapStatusEnum` from the SwapRecord this VT is projected
   * from. Carried verbatim so the History row's in-flight sub-line can
   * render the same human-readable label SwapDetail uses (e.g. "Awaiting
   * external deposit" / "Processing" / "Refunded") instead of the
   * VT-style "transmitted / calculated / mempool" that
   * `mapSwapStatusToVTStatus` necessarily collapses to. The VT-level
   * `status` field stays for the row's visual decisions (colour, icon)
   * because those branches are kind-agnostic; only the human label
   * needs the granular value. Undefined for every non-swap VT kind.
   */
  swapStatus?: SwapStatusEnum;
}
