import { PoolEnum } from '../../AppState';
import { RPCValueTransfersStatusEnum } from '../enums/RPCValueTransfersStatusEnum';
import { RPCValueTransfersKindEnum } from '../enums/RPCValueTransfersKindEnum';

export type RPCValueTransferType = {
  txid: string;
  datetime: number;
  status: RPCValueTransfersStatusEnum;
  blockheight: number;
  transaction_fee?: number;
  zec_price?: number;
  kind: RPCValueTransfersKindEnum;
  value: number;
  recipient_address?: string;
  // Pool lists arrive in protocol order: transparent, sapling, orchard,
  // ironwood. A transfer can span pools (e.g. an Orchard + Ironwood receive).
  pools_sent_from?: PoolEnum[];
  pools_received?: PoolEnum[];
  memos?: string[];
};
