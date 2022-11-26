export default class Address {
  uaAddress: string;
  address: string;
  addressKind: string;
  containsPending: boolean;

  constructor(uaAddress: string, address: string, addressKind: string) {
    this.uaAddress = uaAddress;
    this.address = address;
    this.addressKind = addressKind;
    this.containsPending = false;
  }
}
