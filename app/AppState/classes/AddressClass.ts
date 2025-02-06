import { AddressKindEnum } from '../enums/AddressKindEnum';

export default class AddressClass {
  uOrchardAddress: string;
  address: string;
  addressKind: AddressKindEnum;
  receivers: string;

  constructor(uOrchardAddress: string, address: string, addressKind: AddressKindEnum, receivers: string) {
    this.uOrchardAddress = uOrchardAddress;
    this.address = address;
    this.addressKind = addressKind;
    this.receivers = receivers;
  }
}
