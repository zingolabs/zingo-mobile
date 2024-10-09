import { ChainNameEnum } from '../../AppState';
import { RPCAddressKindEnum } from '../enums/RPCAddressKindEnum';
import { RPCParseStatusEnum } from '../enums/RPCParseStatusEnum';
import { RPCPoolsEnum } from '../enums/RPCPoolsEnum';

export type RPCParseViewKeyType = {
  status: RPCParseStatusEnum;
  chain_name?: ChainNameEnum;
  address_kind?: RPCAddressKindEnum.ufvkAddressKind;
  pools_available?: RPCPoolsEnum[];
};
