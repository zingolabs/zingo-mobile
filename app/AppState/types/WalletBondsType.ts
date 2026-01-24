export default interface WalletBondsType {
  txid: string;
  pubKey: string;
  amount: number;
  status: 'Active' | 'Unbonding' | 'Withdrawn';
  // 0 - Active
  // 1 - Unbonding
  // 2 - Withdrawn
}