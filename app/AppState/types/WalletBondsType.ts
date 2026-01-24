export default interface WalletBondsType {
  txid: string;
  pubKey: string;
  amount: number;
  // 0 - Active
  // 1 - Unbonding
  // 2 - Withdrawn
  status: 'Active' | 'Unbonding' | 'Withdrawn';
  finalizer: string;
}
