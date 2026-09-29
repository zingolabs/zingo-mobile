import { atom } from 'jotai';

import type { Polled } from './polled';

export type Balance = {
  // Total transparent, confirmed and unconfirmed
  totalTransparentBalance: number;

  // Total private, confirmed and unconfirmed
  totalSaplingBalance: number;

  // Total orchard, confirmed and unconfirmed
  totalOrchardBalance: number;

  // Total ironwood (NU6.3), confirmed and unconfirmed
  totalIronwoodBalance: number;

  // Total transparent, only confirmed funds
  confirmedTransparentBalance: number;

  // Total private, only confirmed funds
  confirmedSaplingBalance: number;

  // Total orchard, only confirmed funds
  confirmedOrchardBalance: number;

  // Total ironwood (NU6.3), only confirmed funds
  confirmedIronwoodBalance: number;

  // Total spendable
  totalSpendableBalance: number;
};

// The wallet balance as last reported by the native runtime's poll.
export const balanceAtom = atom<Polled<Balance>>({ kind: 'awaiting' });

const poolPairs = (
  balance: Balance,
): { total: number; confirmed: number }[] => [
  {
    total: balance.totalIronwoodBalance,
    confirmed: balance.confirmedIronwoodBalance,
  },
  {
    total: balance.totalOrchardBalance,
    confirmed: balance.confirmedOrchardBalance,
  },
  {
    total: balance.totalSaplingBalance,
    confirmed: balance.confirmedSaplingBalance,
  },
  {
    total: balance.totalTransparentBalance,
    confirmed: balance.confirmedTransparentBalance,
  },
];

export const hasUnconfirmedFunds = (balance: Balance): boolean =>
  poolPairs(balance).some(pool => pool.total !== pool.confirmed);

export const hasFullyUnconfirmedPool = (balance: Balance): boolean =>
  poolPairs(balance).some(pool => pool.total > 0 && pool.confirmed === 0);
