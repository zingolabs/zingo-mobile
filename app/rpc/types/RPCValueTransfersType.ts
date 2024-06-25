import { PoolEnum } from '../../AppState';

export type RPCValueTransfersType = {
  txid: string;
  datetime: number;
  status: 'pending' | 'confirmed';
  blockheight: number;
  transaction_fee?: number;
  zec_price?: number;
  kind: 'sent' | 'note-to-self' | 'shield' | 'received';
  value: number;
  recipient_address?: string;
  pool_received?: PoolEnum;
  memos?: string[];
};
