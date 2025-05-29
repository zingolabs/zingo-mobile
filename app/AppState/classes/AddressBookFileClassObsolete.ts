export default class AddressBookFileClassObsolete {
  label: string;
  address: string;
  color?: string;
  // obsolete
  uOrchardAddress?: string;

  constructor(label: string, address: string, color?: string) {
    this.label = label;
    this.address = address;
    this.color = color;
  }
}
