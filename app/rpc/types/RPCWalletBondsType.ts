export default interface RPCWalletBondsType {
  created_in_txid: string;
  pub_key: string;
  amount_zats: number;
  // 0 - Active
  // 1 - Unbonding
  // 2 - Withdrawn
  status: 0 | 1 | 2;
  finalizer: string;
}
