export type RPCParseAddressType = {
  status: 'success' | 'Invalid address';
  chain_name?: string;
  address_kind?: 'unified' | 'sapling' | 'transparent';
  receivers_available?: 'orchard' | 'sapling' | 'transparent'[];
};
