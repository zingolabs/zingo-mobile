import { ChainNameEnum } from '../../AppState';

export type RPCParseAddressType = {
  status: 'success' | 'Invalid address';
  chain_name?: ChainNameEnum;
  address_kind?: 'unified' | 'sapling' | 'transparent';
  receivers_available?: ('orchard' | 'sapling' | 'transparent')[];
};
