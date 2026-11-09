export default class TotalBalanceClass {
  // Total transparent, confirmed and unconfirmed
  totalTransparentBalance: number;

  // Total private, confirmed and unconfirmed
  totalSaplingBalance: number;

  // Total orchard, confirmed and unconfirmed
  totalOrchardBalance: number;

  // Total ironwood (NU6.3), confirmed and unconfirmed
  totalIronwoodBalance: number;

  // Total transparent, only confirmed funds
  confirmedTransparentBalance: number;

  // Total private, only confirmed funds
  confirmedSaplingBalance: number;

  // Total orchard, only confirmed funds
  confirmedOrchardBalance: number;

  // Total ironwood (NU6.3), only confirmed funds
  confirmedIronwoodBalance: number;

  // Total spendable
  totalSpendableBalance: number;

  constructor() {
    this.totalTransparentBalance = 0;
    this.totalSaplingBalance = 0;
    this.totalOrchardBalance = 0;
    this.totalIronwoodBalance = 0;
    this.confirmedTransparentBalance = 0;
    this.confirmedSaplingBalance = 0;
    this.confirmedOrchardBalance = 0;
    this.confirmedIronwoodBalance = 0;
    this.totalSpendableBalance = 0;
  }
}

const poolPairs = (
  balance: TotalBalanceClass,
): { total: number; confirmed: number }[] => [
  {
    total: balance.totalIronwoodBalance,
    confirmed: balance.confirmedIronwoodBalance,
  },
  {
    total: balance.totalOrchardBalance,
    confirmed: balance.confirmedOrchardBalance,
  },
  {
    total: balance.totalSaplingBalance,
    confirmed: balance.confirmedSaplingBalance,
  },
  {
    total: balance.totalTransparentBalance,
    confirmed: balance.confirmedTransparentBalance,
  },
];

export const hasUnconfirmedFunds = (balance: TotalBalanceClass): boolean =>
  poolPairs(balance).some(pool => pool.total !== pool.confirmed);

export const hasFullyUnconfirmedPool = (balance: TotalBalanceClass): boolean =>
  poolPairs(balance).some(pool => pool.total > 0 && pool.confirmed === 0);
