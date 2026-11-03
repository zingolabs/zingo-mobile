import type { TokenEntryType } from '@app/swap';
import { assetMatches } from '@screens/Swap/components/AssetPickerSheet';
import { repeatedCoins, shortContract } from '@screens/Swap/swapAssets';

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

describe('repeatedCoins', () => {
  const on = (identifier: string, chain: string, ticker: string) => ({
    ...coin(ticker, ticker, chain),
    identifier,
  });

  test('Tests that coins are repeated when they share chain and ticker, whatever the casing.', () => {
    expect(
      repeatedCoins([
        on('NEAR.wBTC-a', 'NEAR', 'wBTC'),
        on('NEAR.WBTC-b', 'NEAR', 'WBTC'),
      ]),
    ).toEqual(new Set(['NEAR.wBTC-a', 'NEAR.WBTC-b']));
  });

  test('Tests that a coin is not repeated when its other entries are on other chains.', () => {
    expect(
      repeatedCoins([
        on('ETH.ETH', 'ETH', 'ETH'),
        on('BASE.ETH', 'BASE', 'ETH'),
      ]).size,
    ).toBe(0);
  });
});

describe('shortContract', () => {
  test('Tests that a contract is cut in the middle when it is long, and left alone when it is not.', () => {
    expect(
      shortContract('miden-0x419f8f4bff72959132aa7cea15a4c1.omft.near'),
    ).toBe('miden-0x419f…omft.near');
    expect(shortContract('eth.bridge.near')).toBe('eth.bridge.near');
  });
});

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
