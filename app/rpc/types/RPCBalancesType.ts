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
};
