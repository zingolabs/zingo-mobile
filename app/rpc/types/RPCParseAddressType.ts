import { ChainNameEnum } from '../../AppState';
import { RPCAdressKindEnum } from '../enums/RPCAddressKindEnum';
import { RPCParseStatusEnum } from '../enums/RPCParseStatusEnum';
import { RPCReceiversEnum } from '../enums/RPCReceiversEnum';

export type RPCParseAddressType = {
  status: RPCParseStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?:
    | RPCAdressKindEnum.unifiedAddressKind
    | RPCAdressKindEnum.saplingAddressKind
    | RPCAdressKindEnum.transparentAddressKind;
  receivers_available?: RPCReceiversEnum[];
};
