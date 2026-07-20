export type RPCBalancesType = {
  total_orchard_balance: number;
  total_sapling_balance: number;
  total_transparent_balance: number;

  confirmed_transparent_balance: number;
  confirmed_orchard_balance: number;
  confirmed_sapling_balance: number;

  unconfirmed_orchard_balance: number;
  unconfirmed_sapling_balance: number;
  unconfirmed_transparent_balance: number;

  // Ironwood (NU6.3) pool. zingolib emits these as Option, so they may be
  // null/absent before activation or on wallets without Ironwood funds.
  total_ironwood_balance?: number | null;
  confirmed_ironwood_balance?: number | null;
  unconfirmed_ironwood_balance?: number | null;
};
