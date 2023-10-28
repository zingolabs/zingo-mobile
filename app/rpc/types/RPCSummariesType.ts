export type RPCSummariesType = {
  block_height: number; // not using.
  datetime: number;
  txid: string;
  price?: number | null | 'None';
  amount: number;
  to_address?: string;
  memos?: string[];
  kind: 'Sent' | 'Received' | 'SendToSelf' | 'Fee';
  pool?: 'Orchard' | 'Sapling' | 'Transparent' | 'None';
  unconfirmed: boolean;
};
