import { TransactionTypeEnum } from '../enums/TransactionTypeEnum';
import TxDetailType from './TxDetailType';

export default interface TransactionType {
  type: TransactionTypeEnum.Sent | TransactionTypeEnum.Received | TransactionTypeEnum.SendToSelf; // like kind
  fee?: number;
  confirmations: number;
  txid: string;
  time: number;
  zecPrice?: number;
  txDetails: TxDetailType[];
  // eslint-disable-next-line semi
}
