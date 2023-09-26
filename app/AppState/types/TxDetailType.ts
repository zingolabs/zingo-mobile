export default interface TxDetailType {
  address: string;
  amount: number;
  memos?: string[];
  pool?: 'Orchard' | 'Sapling' | 'Transparent';
  // eslint-disable-next-line semi
}
