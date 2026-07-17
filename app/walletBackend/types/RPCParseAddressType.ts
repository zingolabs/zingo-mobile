import { ChainNameEnum } from '../../AppState';
import { RPCAddressKindEnum } from '../enums/RPCAddressKindEnum';
import { RPCParseAddressStatusEnum } from '../enums/RPCParseAddressStatusEnum';
import { RPCReceiversEnum } from '../enums/RPCReceiversEnum';

export type RPCParseAddressType = {
  status: RPCParseAddressStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | RPCAddressKindEnum.unifiedAddressKind
    | RPCAddressKindEnum.saplingAddressKind
    | RPCAddressKindEnum.transparentAddressKind
    | RPCAddressKindEnum.texAddressKind;
  receivers_available?: RPCReceiversEnum[];
  only_orchard_ua?: string;
};
