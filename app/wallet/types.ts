import { ChainNameEnum } from '@app/AppState/enums/ChainNameEnum';
import { RPCValueTransfersStatusEnum } from '@app/walletBackend/enums/RPCValueTransfersStatusEnum';

import { PoolEnum, TransactionTypeEnum, ValueTransferKindEnum } from './enums';

export interface WalletType {
  seed?: string;
  ufvk?: string;
  birthday: number;
}

export interface SendJsonToTypeType {
  address: string;
  amount: number;
  memo?: string;
}

// What a hold-to-delete confirms: removing the wallet file before an import
// or a create, or overwriting the phrase a previous install left in the
// Keychain.
export type DeleteWalletContext = 'import' | 'create' | 'replace';

export interface TransactionType {
  type?: TransactionTypeEnum; // like kind
  fee?: number;
  confirmations: number;
  txid: string;
  time: number;
  zecPrice?: number;
  txDetails: TxDetailType[];
}

export interface TxDetailType {
  // those field excepcionally can be different between
  // transaction with the same txid.
  type?: TransactionTypeEnum;
  fee?: number;
  confirmations?: number;
  time?: number;
  zecPrice?: number;
  // normal data
  address: string;
  amount: number;
  memos?: string[];
  poolType?: PoolEnum;
}

export interface ValueTransferType {
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
  /** The text of the transaction's OP_RETURN outputs, where a transparent Maya or THORChain payout signs itself. */
  opReturnData?: string[];
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

export type PoolNameType = 'transparent' | 'sapling' | 'orchard' | 'ironwood';

export type ProposalPoolsType = {
  source: PoolNameType[];
  destination: PoolNameType[];
};

// 'chain': the wallet is on another network than the server it would open on.
export type WalletErrorKind = 'open' | 'server' | 'chain';

// What the error screen shows when the wallet on disk will not open.
export type WalletErrorInfo = {
  kind: WalletErrorKind;
  details: string;
  // The wallet's own network, for the 'chain' kind.
  walletChain?: ChainNameEnum;
};
