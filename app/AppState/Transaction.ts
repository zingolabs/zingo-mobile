import TxDetailType from './TxDetailType';

export default interface Transaction {
  type: string;
  address: string;
  amount: number;
  position: string;
  confirmations: number;
  txid: string;
  time: number;
  zec_price: number | null;
  detailedTxns: TxDetailType[];
}
