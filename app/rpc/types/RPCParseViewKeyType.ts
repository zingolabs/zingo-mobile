export type RPCParseViewKeyType = {
  status: 'success' | 'Invalid address';
  chain_name?: string;
  address_kind?: 'ufvk';
  pools_available?: 'orchard' | 'sapling' | 'transparent'[];
};
