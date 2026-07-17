export type RPCSaplingNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: string;
  pending: string;
  // deprecated
  //is_change: boolean;
  address: string;
  spendable: string;
  spent: string;
  spent_at_height: number;
  pending_spent: string;
};
