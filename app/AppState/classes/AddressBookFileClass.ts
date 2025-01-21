export default class AddressBookFileClass {
  label: string;
  address: string;
  uOrchardAddress?: string;

  constructor(label: string, address: string, uOrchardAddress?: string) {
    this.label = label;
    this.address = address;
    this.uOrchardAddress = uOrchardAddress;
  }
}
