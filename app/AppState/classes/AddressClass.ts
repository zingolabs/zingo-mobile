export default class AddressClass {
  uaAddress: string;
  address: string;
  addressKind: string;
  containsPending: boolean;
  receivers: string;

  constructor(uaAddress: string, address: string, addressKind: string, receivers: string) {
    this.uaAddress = uaAddress;
    this.address = address;
    this.addressKind = addressKind;
    this.receivers = receivers;
    this.containsPending = false;
  }
}
