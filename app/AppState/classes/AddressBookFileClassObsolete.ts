export default class AddressBookFileClassObsolete {
  label: string;
  address: string;
  color?: string;
  own?: boolean;
  // obsolete
  uOrchardAddress?: string;

  constructor(label: string, address: string, color?: string, own?: boolean) {
    this.label = label;
    this.address = address;
    this.color = color;
    this.own = own;
  }
}
