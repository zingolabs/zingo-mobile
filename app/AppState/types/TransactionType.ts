import TxDetailType from './TxDetailType';

export default interface TransactionType {
  type: 'Sent' | 'Received';
  address: string;
  amount: number;
  fee?: number;
  memos: string[];
  position?: string;
  confirmations: number;
  txid: string;
  time: number;
  zec_price: number | null;
  detailedTxns?: TxDetailType[];
  // eslint-disable-next-line semi
}
