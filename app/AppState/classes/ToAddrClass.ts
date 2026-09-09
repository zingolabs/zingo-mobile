export default class ToAddrClass {
  id: number;
  to: string;
  amount: string;
  amountCurrency: string;
  memo: string;
  includeUAMemo: boolean;
  // The `name.zcash` this recipient was resolved from, empty when the address
  // was entered directly. Carried so the confirmation screen can name the
  // recipient the way the user did, and offer it when saving a contact.
  znsAlias: string;

  constructor(id: number) {
    this.id = id;
    this.to = '';
    this.amount = '';
    this.amountCurrency = '';
    this.memo = '';
    this.includeUAMemo = false;
    this.znsAlias = '';
  }
}
