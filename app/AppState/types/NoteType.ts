export default interface NoteType {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: number;
  scriptkey?: string;
  unconfirmed?: string;
  is_change: boolean;
  address: string;
  spendable?: string;
  spent: string;
  spent_at_height: number;
  unconfirmed_spent: string;

  pool: 'Orchard' | 'Sapling' | 'Transparent';
  type: 'Pending' | 'Unspent';

  // eslint-disable-next-line semi
}
