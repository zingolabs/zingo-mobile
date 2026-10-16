import TotalBalanceClass from '@app/AppState/classes/TotalBalanceClass';
import { poolsWorthALook } from '@ui/widgets/Header/components/poolsWorthALook';

const balance = (b: Partial<TotalBalanceClass>): TotalBalanceClass => ({
  ...new TotalBalanceClass(),
  ...b,
});

test('Tests that the pools icon stays hidden when every zatoshi is confirmed in Ironwood', () => {
  expect(
    poolsWorthALook(
      balance({ totalIronwoodBalance: 2, confirmedIronwoodBalance: 2 }),
    ),
  ).toBe(false);
});

test('Tests that the pools icon shows when part of the Ironwood balance still confirms', () => {
  expect(
    poolsWorthALook(
      balance({ totalIronwoodBalance: 2, confirmedIronwoodBalance: 1 }),
    ),
  ).toBe(true);
});

test('Tests that the pools icon shows when funds wait in Orchard, Sapling or transparent', () => {
  expect(poolsWorthALook(balance({ totalOrchardBalance: 1 }))).toBe(true);
  expect(poolsWorthALook(balance({ totalSaplingBalance: 1 }))).toBe(true);
  expect(poolsWorthALook(balance({ totalTransparentBalance: 1 }))).toBe(true);
});
