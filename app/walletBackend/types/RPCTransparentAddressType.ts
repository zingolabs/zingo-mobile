import { AddressScope } from '@app/wallet/address';

export type RPCTransparentAddressType = {
  account: number;
  address_index: number;
  scope: AddressScope;
  encoded_address: string;
};
