import { ChainNameEnum } from '../../AppState';
import { RPCAddressKindEnum } from '../enums/RPCAddressKindEnum';
import { RPCParseViewKeyStatusEnum } from '../enums/RPCParseViewKeyStatusEnum';
import { RPCPoolsEnum } from '../enums/RPCPoolsEnum';

export type RPCParseViewKeyType = {
  status: RPCParseViewKeyStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?: RPCAddressKindEnum.ufvkAddressKind;
  pools_available?: RPCPoolsEnum[];
};
