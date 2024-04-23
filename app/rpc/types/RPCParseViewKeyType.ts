import { ChainNameEnum } from '../../AppState';

export type RPCParseViewKeyType = {
  status: 'success' | 'Invalid address';
  chain_name?: ChainNameEnum;
  address_kind?: 'ufvk';
  pools_available?: 'orchard' | 'sapling' | 'transparent'[];
};
