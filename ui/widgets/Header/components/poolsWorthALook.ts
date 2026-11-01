import TotalBalanceClass from '@app/AppState/classes/TotalBalanceClass';

/**
 * Whether the balance needs its pools explained. Ironwood is the main
 * shielded pool: the icon shows while a shielded balance still confirms, or
 * while funds sit in Orchard, Sapling or transparent, waiting to move.
 */
export const poolsWorthALook = (balance: TotalBalanceClass): boolean =>
  balance.totalIronwoodBalance !== balance.confirmedIronwoodBalance ||
  balance.totalOrchardBalance > 0 ||
  balance.totalSaplingBalance > 0 ||
  balance.totalTransparentBalance > 0;
