export default class ToAddrClass {
  id: number;
  to: string;
  amount: string;
  amountCurrency: string;
  memo: string;

  constructor(id: number) {
    this.id = id;
    this.to = '';
    this.amount = '';
    this.amountCurrency = '';
    this.memo = '';
  }
}
