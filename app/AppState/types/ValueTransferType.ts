import { ValueTransferKindEnum } from '@app/AppState/enums/ValueTransferKindEnum';
import { PoolEnum } from '@app/AppState/enums/PoolEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

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
  // Set only on rows projected from a swap record. The detail reads
  // `swapRecordId` to find the record behind the row, and the list reads the
  // other two to label direction and granular state, which the five-value
  // `status` above cannot carry.
  swapRecordId?: string;
  swapIsInbound?: boolean;
  swapStatus?: string;
  // The counterparty asset the row's `amount` is denominated in, and its USD
  // unit price at quote time. A swap row shows no ZEC, so the wallet's
  // currency name and ZEC price do not apply to it.
  swapAssetTicker?: string;
  swapUsdUnitPrice?: number;
  // The provider the swap ran through, for the logo the row shows.
  swapProvider?: string;
}
