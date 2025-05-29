import { RPCAddressScopeEnum } from '../../rpc/enums/RPCAddressScopeEnum';
import { AddressKindEnum } from '../enums/AddressKindEnum';

export default class TransparentAddressClass {
  index: number;
  address: string;
  addressKind: AddressKindEnum;
  scope: RPCAddressScopeEnum;

  constructor(index: number, address: string, addressKind: AddressKindEnum, scope: RPCAddressScopeEnum) {
    this.index = index;
    this.address = address;
    this.addressKind = addressKind;
    this.scope = scope;
  }
}
