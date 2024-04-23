import { TransactionTypeEnum } from '../enums/TransactionTypeEnum';
import TxDetailType from './TxDetailType';

export default interface TransactionType {
  type: TransactionTypeEnum; // like kind
  fee?: number;
  confirmations: number;
  txid: string;
  time: number;
  zec_price?: number;
  txDetails: TxDetailType[];
  // eslint-disable-next-line semi
}
