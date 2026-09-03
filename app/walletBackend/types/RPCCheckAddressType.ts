import { RPCAddressScopeEnum } from '@app/walletBackend/enums/RPCAddressScopeEnum';
import { RPCCheckAddressTypeEnum } from '@app/walletBackend/enums/RPCCheckAddressTypeEnum';

export type RPCCheckAddressType = {
  is_wallet_address: boolean;
  account_id: number;
  address_type: RPCCheckAddressTypeEnum;
  encoded_address: string;
  address_index?: number;
  has_orchard?: boolean;
  has_sapling?: boolean;
  has_transparent?: boolean;
  diversifier_index?: number;
  scope?: RPCAddressScopeEnum;
};
