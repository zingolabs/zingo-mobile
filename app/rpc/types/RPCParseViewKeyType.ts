export type RPCParseViewKeyType = {
  status: 'success' | 'Invalid address';
  chain_name?: 'main' | 'test' | 'regtest';
  address_kind?: 'ufvk';
  pools_available?: 'orchard' | 'sapling' | 'transparent'[];
};
