import TxDetailType from './TxDetailType';

export default interface TransactionType {
  type: 'Sent' | 'Received' | 'SendToSelf'; // like kind
  fee?: number;
  confirmations: number;
  txid: string;
  time: number;
  zec_price?: number;
  txDetails: TxDetailType[];
  // eslint-disable-next-line semi
}
