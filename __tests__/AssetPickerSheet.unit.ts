import type { TokenEntryType } from '@app/swap';
import { assetMatches } from '@screens/Swap/components/AssetPickerSheet';

const coin = (
  ticker: string,
  name: string,
  chain = ticker,
): TokenEntryType => ({
  chain,
  chainId: '1',
  ticker,
  identifier: `${chain}.${ticker}`,
  symbol: ticker,
  name,
  decimals: 8,
});

const manyCoins = Array.from({ length: 100 }, (_, i) =>
  coin(`A${String(i).padStart(3, '0')}`, `Alpha ${i}`),
);

describe('assetMatches', () => {
  test('Tests that every coin is listed when nothing is typed, up to the last of the alphabet.', () => {
    const { rest } = assetMatches([coin('ZZZ', 'Last'), ...manyCoins], '');
    expect(rest).toHaveLength(101);
    expect(rest[rest.length - 1].ticker).toBe('ZZZ');
  });

  test('Tests that every match is listed when a search has more than 60.', () => {
    expect(assetMatches(manyCoins, 'alpha').rest).toHaveLength(100);
  });

  test('Tests that every coin on a network is listed when a search names that network.', () => {
    const onBase = Array.from({ length: 80 }, (_, i) =>
      coin(`B${String(i).padStart(3, '0')}`, `Beta ${i}`, 'BASE'),
    );
    expect(assetMatches(onBase, 'base').onNetwork).toHaveLength(80);
  });
});
