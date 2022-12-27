import TxDetailType from './TxDetailType';

export default interface Transaction {
  type: 'sent' | 'receive';
  address: string;
  amount: number;
  position: string;
  confirmations: number;
  txid: string;
  time: number;
  zec_price: number;
  detailedTxns: TxDetailType[];
  // eslint-disable-next-line semi
}
