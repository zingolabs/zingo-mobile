export default class TotalBalanceClass {
  // Total transparent, confirmed and unconfirmed
  transparentBal: number;

  // Total private, confirmed + pending
  privateBal: number;

  // Total orchard, confirmed + pending
  orchardBal: number;

  // Total transparent, only confirmed
  confirmedTransparent: number;

  // Total private, confirmed funds that are spendable
  spendablePrivate: number;

  // Total orchard, confirmed funds that are spendable
  spendableOrchard: number;

  // Total pending + spendable
  total: number;

  constructor() {
    this.transparentBal = 0;
    this.confirmedTransparent = 0;
    this.privateBal = 0;
    this.spendablePrivate = 0;
    this.orchardBal = 0;
    this.spendableOrchard = 0;
    this.total = 0;
  }
}
