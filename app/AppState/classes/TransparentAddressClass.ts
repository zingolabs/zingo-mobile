import { RPCAddressScopeEnum } from '../../walletBackend/types/rpcAddressTypes';
import { AddressKindEnum } from '../enums/AddressKindEnum';

export default class TransparentAddressClass {
  index: number;
  address: string;
  addressKind: AddressKindEnum.t;
  scope: RPCAddressScopeEnum;

  constructor(
    index: number,
    address: string,
    addressKind: AddressKindEnum.t,
    scope: RPCAddressScopeEnum,
  ) {
    this.index = index;
    this.address = address;
    this.addressKind = addressKind;
    this.scope = scope;
  }
}
