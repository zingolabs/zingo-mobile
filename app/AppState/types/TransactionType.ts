import TxDetailType from './TxDetailType';

export default interface TransactionType {
  type: 'Sent' | 'Received'; // like kind
  address?: string;
  amount: number;
  fee?: number;
  memos?: string[];
  position?: string;
  confirmations: number;
  txid: string;
  time: number;
  zec_price?: number | null;
  detailedTxns?: TxDetailType[];
  pool?: 'Orchard' | 'Sapling' | 'Transparent';
  // eslint-disable-next-line semi
}
