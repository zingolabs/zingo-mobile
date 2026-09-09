import { PoolEnum } from '@app/AppState/enums/PoolEnum';
import { TransactionTypeEnum } from '@app/AppState/enums/TransactionTypeEnum';

export default interface TxDetailType {
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
