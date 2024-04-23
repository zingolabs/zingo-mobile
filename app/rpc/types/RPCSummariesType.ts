import { PoolEnum, TransactionTypeEnum } from '../../AppState';

export type RPCSummariesType = {
  block_height: number; // not using.
  datetime: number;
  txid: string;
  price?: number | null | 'None';
  amount: number;
  to_address?: string;
  memos?: string[];
  kind: TransactionTypeEnum;
  pool?: PoolEnum | 'None';
  unconfirmed: boolean;
};
