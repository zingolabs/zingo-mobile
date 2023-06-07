export type RPCParseAddressType = {
  status: 'success' | 'Invalid address';
  chain_name?: 'main' | 'test' | 'regtest';
  address_kind?: 'unified' | 'sapling' | 'transparent';
  receivers_available?: 'orchard' | 'sapling' | 'transparent'[];
};
