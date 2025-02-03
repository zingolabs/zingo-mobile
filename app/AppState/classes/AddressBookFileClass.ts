export default class AddressBookFileClass {
  label: string;
  address: string;
  uOrchardAddress?: string;
  color?: string;

  constructor(label: string, address: string, uOrchardAddress?: string, color?: string) {
    this.label = label;
    this.address = address;
    this.uOrchardAddress = uOrchardAddress;
    this.color = color;
  }
}
