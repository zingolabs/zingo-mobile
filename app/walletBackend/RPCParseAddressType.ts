import { ChainNameEnum } from '@app/AppState';
import { RPCAddressKindEnum } from '@app/walletBackend/RPCAddressKindEnum';
import { RPCParseAddressStatusEnum } from '@app/walletBackend/RPCParseAddressStatusEnum';
import { RPCReceiversEnum } from '@app/walletBackend/RPCReceiversEnum';

export type RPCParseAddressType = {
  status: RPCParseAddressStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | RPCAddressKindEnum.unifiedAddressKind
    | RPCAddressKindEnum.saplingAddressKind
    | RPCAddressKindEnum.transparentAddressKind
    | RPCAddressKindEnum.texAddressKind;
  receivers_available?: RPCReceiversEnum[];
  shielded_only_ua?: string;
};
