export type UtxoNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  scriptkey: string;
  is_change: boolean;
  address: string;
  spent_at_height: number;
  spent: string;
  unconfirmed_spent: string;
};
