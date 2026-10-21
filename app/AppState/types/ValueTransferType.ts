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
  // The asset ZEC was traded against, and ZEC's USD unit price when the
  // route was quoted, which is what the row's `amount` was worth then.
  swapAssetTicker?: string;
  swapUsdUnitPrice?: number;
  // The provider the swap ran through, for the logo the row shows.
  swapProvider?: string;
}
