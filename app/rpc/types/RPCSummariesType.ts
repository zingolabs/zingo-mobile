export type RPCSummariesType = {
  block_height: number;
  datetime: number;
  txid: string;
  price: number | null;
  amount: number;
  to_address?: string;
  memos?: string[];
  kind: 'Sent' | 'Received' | 'SendToSelf' | 'Fee';
  pool?: 'Orchard' | 'Sapling' | 'Transparent';
};
