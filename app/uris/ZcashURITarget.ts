export class ZcashURITarget {
  address?: string;

  amount?: number;

  label?: string;

  message?: string;

  memoBase64?: string;

  memoString?: string;

  // A default constructor that creates a basic Target
  constructor(address?: string, amount?: number, memo?: string) {
    this.address = address;
    this.amount = amount;
    this.memoString = memo;
  }
}
