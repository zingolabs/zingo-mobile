import { ChainNameEnum } from '../../AppState';
import { RPCAddressKindEnum } from '../enums/RPCAddressKindEnum';
import { RPCParseStatusEnum } from '../enums/RPCParseStatusEnum';
import { RPCReceiversEnum } from '../enums/RPCReceiversEnum';

export type RPCParseAddressType = {
  status: RPCParseStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | RPCAddressKindEnum.unifiedAddressKind
    | RPCAddressKindEnum.saplingAddressKind
    | RPCAddressKindEnum.transparentAddressKind
    | RPCAddressKindEnum.texAddressKind;
  receivers_available?: RPCReceiversEnum[];
};
