import { Pool } from './pool';

export type ValueTransferKind =
  | 'Sent'
  | 'Received'
  | 'MemoToSelf'
  | 'SendToSelf'
  | 'Shield'
  | 'Rejection'
  // A send-to-self that drains the Orchard pool into Ironwood (NU6.3 migration).
  | 'Migration'
  // A swap this wallet made, projected from its local record by
  // `swapRecordToValueTransfer`. zingolib reports none of these.
  | 'Swap';

export type ValueTransferStatus =
  'calculated' | 'transmitted' | 'mempool' | 'confirmed' | 'failed';

export interface ValueTransferType {
  txid: string;
  kind: ValueTransferKind;
  fee?: number;
  confirmations: number;
  blockheight: number;
  time: number;
  zecPrice?: number;
  address?: string;
  amount: number;
  memos?: string[];
  poolType?: Pool;
  status: ValueTransferStatus;
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
