export type RPCWalletKindType = {
  kind: 'Seeded' | 'Loaded from key';
  transparent?: string;
  sapling?: string;
  orchard?: string;
};
