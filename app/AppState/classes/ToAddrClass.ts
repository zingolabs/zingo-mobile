export default class ToAddrClass {
  id: number;
  to: string;
  amount: string;
  amountUSD: string;
  memo: string;

  constructor(id: number) {
    this.id = id;
    this.to = '';
    this.amount = '';
    this.amountUSD = '';
    this.memo = '';
  }
}
