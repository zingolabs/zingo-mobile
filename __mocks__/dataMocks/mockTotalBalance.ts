import type { Balance } from '@app/AppState/balance';
import type { Polled } from '@app/AppState/polled';

export const mockTotalBalance: Balance = {
  totalTransparentBalance: 0.12345678,
  confirmedTransparentBalance: 0.12345678,
  totalSaplingBalance: 0.4,
  confirmedSaplingBalance: 0.2,
  totalOrchardBalance: 0.6,
  confirmedOrchardBalance: 0.3,
  totalIronwoodBalance: 0.5,
  confirmedIronwoodBalance: 0.5,
  totalSpendableBalance: 1.12345678,
};

export const polledMockTotalBalance: Polled<Balance> = {
  kind: 'polled',
  latest: mockTotalBalance,
};
