export default class AddressBookFileClass {
  label: string;
  address: string;
  color: string;
  own: boolean;

  constructor(label: string, address: string, color: string, own: boolean) {
    this.label = label;
    this.address = address;
    this.color = color;
    this.own = own;
  }
}
