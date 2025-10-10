export default class TotalBalanceClass {
  // Total transparent, confirmed and unconfirmed
  totalTransparentBalance: number;

  // Total private, confirmed and unconfirmed
  totalSaplingBalance: number;

  // Total orchard, confirmed and unconfirmed
  totalOrchardBalance: number;

  // Total transparent, only confirmed funds
  confirmedTransparentBalance: number;

  // Total private, only confirmed funds
  confirmedSaplingBalance: number;

  // Total orchard, only confirmed funds
  confirmedOrchardBalance: number;

  // Total spendable
  totalSpendableBalance: number;

  constructor() {
    this.totalTransparentBalance = 0;
    this.totalSaplingBalance = 0;
    this.totalOrchardBalance = 0;
    this.confirmedTransparentBalance = 0;
    this.confirmedSaplingBalance = 0;
    this.confirmedOrchardBalance = 0;
    this.totalSpendableBalance = 0;
  }
}
