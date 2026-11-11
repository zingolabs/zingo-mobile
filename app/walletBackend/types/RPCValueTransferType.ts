import { Pool } from '@app/wallet/pool';
import { ValueTransferStatus } from '@app/wallet/transfer';
import { RPCValueTransfersKindEnum } from '@app/walletBackend/enums/RPCValueTransfersKindEnum';

export type RPCValueTransferType = {
  txid: string;
  datetime: number;
  status: ValueTransferStatus;
  blockheight: number;
  transaction_fee?: number;
  zec_price?: number;
  kind: RPCValueTransfersKindEnum;
  value: number;
  recipient_address?: string;
  // Pool lists arrive in protocol order: transparent, sapling, orchard,
  // ironwood. A transfer can span pools (e.g. an Orchard + Ironwood receive).
  pools_sent_from?: Pool[];
  pools_received?: Pool[];
  memos?: string[];
};
