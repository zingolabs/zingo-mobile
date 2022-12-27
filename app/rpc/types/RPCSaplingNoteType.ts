export type RPCSaplingNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  unconfirmed: string;
  is_change: boolean;
  address: string;
  spendable: string;
  spent: string;
  spent_at_height: number;
  unconfirmed_spent: string;
};
