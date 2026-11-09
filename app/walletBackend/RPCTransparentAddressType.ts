import { RPCAddressScopeEnum } from '@app/walletBackend/RPCAddressScopeEnum';

export type RPCTransparentAddressType = {
  account: number;
  address_index: number;
  scope: RPCAddressScopeEnum;
  encoded_address: string;
};
