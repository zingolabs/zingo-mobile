import { AddressKindEnum } from '../enums/AddressKindEnum';

export default class UnifiedAddressClass {
  index: number;
  address: string;
  addressKind: AddressKindEnum;
  has_orchard: boolean;
  has_sapling: boolean;
  has_transparent: boolean;

  constructor(index: number, address: string, addressKind: AddressKindEnum, has_orchard: boolean, has_sapling: boolean, has_transparent: boolean) {
    this.index = index;
    this.address = address;
    this.addressKind = addressKind;
    this.has_orchard = has_orchard;
    this.has_sapling = has_sapling;
    this.has_transparent = has_transparent;
  }
}
