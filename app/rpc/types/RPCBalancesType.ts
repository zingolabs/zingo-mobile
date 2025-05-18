export type RPCBalancesType = {
  orchard_balance: number;
  sapling_balance: number;
  confirmed_transparent_balance: number;

  unconfirmed_transparent_balance: number;

  spendable_orchard_balance: number;
  spendable_sapling_balance: number;

  unverified_orchard_balance: number;
  unverified_sapling_balance: number;

  verified_orchard_balance: number;
  verified_sapling_balance: number;
};
