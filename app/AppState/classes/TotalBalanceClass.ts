export default class TotalBalanceClass {
  // Total transparent, confirmed and unconfirmed
  totalTransparentBalance: number;

  // Total private, confirmed + pending
  totalSaplingBalance: number;

  // Total orchard, confirmed + pending
  totalOrchardBalance: number;

  // Total transparent, only confirmed
  confirmedTransparentBalance: number;

  // Total private, confirmed funds
  confirmedSaplingBalance: number;

  // Total orchard, confirmed funds
  confirmedOrchardBalance: number;

  // Total pending + confirmed
  total: number;

  // Total spendable
  totalSpendable: number;

  constructor() {
    this.totalTransparentBalance = 0;
    this.totalSaplingBalance = 0;
    this.totalOrchardBalance = 0;
    this.confirmedTransparentBalance = 0;
    this.confirmedSaplingBalance = 0;
    this.confirmedOrchardBalance = 0;
    this.total = 0;
    this.totalSpendable = 0;
  }
}
