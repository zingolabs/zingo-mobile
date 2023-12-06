export type RPCUtxoNoteType = {
  created_in_block: number;
  datetime: number;
  created_in_txid: string;
  value: number;
  scriptkey: string;
  is_change: boolean;
  address: string;
  spent: string;
  spent_at_height: number;
  unconfirmed_spent: string;
};
