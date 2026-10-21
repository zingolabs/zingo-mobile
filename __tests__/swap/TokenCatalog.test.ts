import { TokenCatalog } from '@app/swap/TokenCatalog';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import type { SwapKitClient } from '@app/swap/SwapKitClient';
import type {
  TokenEntryType,
  TokensResponseType,
} from '@app/swap/types/TokensResponseType';

/**
 * The catalog decides what the asset picker offers. Its failures are quiet:
 * an asset that routes fine simply is not in the list, and nobody reports a
 * token they never saw. That already happened once, when an exact-case match
 * against the routability endpoints dropped every NEAR asset, so the casing
 * rules are the part worth holding still.
 */

const token = (
  identifier: string,
  overrides: Partial<TokenEntryType> = {},
): TokenEntryType =>
  ({
    identifier,
    chain: identifier.split('.')[0],
    chainId: identifier.split('.')[0].toLowerCase(),
    ticker: identifier.split('.')[1] ?? identifier,
    symbol: identifier.split('.')[1] ?? identifier,
    name: identifier,
    decimals: 8,
    ...overrides,
  }) as TokenEntryType;

const bucket = (provider: string, tokens: TokenEntryType[]) =>
  ({ provider, name: provider, tokens }) as TokensResponseType[number];

type ClientStub = {
  tokens: jest.Mock;
  swapTo: jest.Mock;
  swapFrom: jest.Mock;
};

const catalogOver = (args: {
  buckets: TokensResponseType;
  swapTo?: string[] | Error;
  swapFrom?: string[] | Error;
}): { catalog: TokenCatalog; client: ClientStub } => {
  const resolveOr = (value: string[] | Error | undefined) =>
    value instanceof Error
      ? Promise.reject(value)
      : Promise.resolve(value ?? []);
  const client: ClientStub = {
    tokens: jest.fn(async () => args.buckets),
    swapTo: jest.fn(() => resolveOr(args.swapTo)),
    swapFrom: jest.fn(() => resolveOr(args.swapFrom)),
  };
  return {
    catalog: new TokenCatalog(client as unknown as SwapKitClient),
    client,
  };
};

const identifiers = (tokens: TokenEntryType[]) => tokens.map(t => t.identifier);

describe('which tokens survive the catalog', () => {
  it('keeps only the providers that route ZEC', () => {
    const { catalog } = catalogOver({
      buckets: [
        bucket(SwapKitProviderEnum.MayachainStreaming, [token('BTC.BTC')]),
        bucket(SwapKitProviderEnum.Near, [token('NEAR.NEAR')]),
        bucket(SwapKitProviderEnum.Flashnet, [token('SP.FLASH')]),
        bucket(SwapKitProviderEnum.Chainflip, [token('DOT.DOT')]),
        bucket(SwapKitProviderEnum.Jupiter, [token('SOL.JUP')]),
      ],
    });

    return catalog.listTokens().then(tokens => {
      expect(identifiers(tokens)).toEqual(
        expect.arrayContaining(['BTC.BTC', 'NEAR.NEAR', 'SP.FLASH']),
      );
      expect(identifiers(tokens)).not.toContain('DOT.DOT');
      expect(identifiers(tokens)).not.toContain('SOL.JUP');
    });
  });

  // ZEC is the fixed side of every swap here, so offering it as the other side
  // would be offering a swap to itself.
  it('drops ZEC itself', async () => {
    const { catalog } = catalogOver({
      buckets: [
        bucket(SwapKitProviderEnum.MayachainStreaming, [
          token('ZEC.ZEC'),
          token('BTC.BTC'),
        ]),
      ],
    });

    expect(identifiers(await catalog.listTokens())).toEqual(['BTC.BTC']);
  });

  // The same on-chain asset arrives from several buckets, and on EVM chains
  // the address is case-insensitive by spec, so collapsing them is correct.
  it('dedupes an asset that arrives from more than one provider', async () => {
    const { catalog } = catalogOver({
      buckets: [
        bucket(SwapKitProviderEnum.MayachainStreaming, [
          token('ETH.USDC-0xA0B8'),
        ]),
        bucket(SwapKitProviderEnum.Near, [token('eth.usdc-0xa0b8')]),
      ],
    });

    expect(await catalog.listTokens()).toHaveLength(1);
  });

  // SwapKit ships `name` and `symbol` inconsistently, and an earlier integrity
  // guard that demanded them kept dropping perfectly routable assets. Only the
  // two fields the app structurally needs are required.
  it('keeps an entry missing the fields SwapKit ships unevenly', async () => {
    const sparse = { identifier: 'TON.TON', chain: 'TON' } as TokenEntryType;
    const { catalog } = catalogOver({
      buckets: [bucket(SwapKitProviderEnum.MayachainStreaming, [sparse])],
    });

    expect(identifiers(await catalog.listTokens())).toContain('TON.TON');
  });

  it('skips an entry with no identifier or no chain', async () => {
    const { catalog } = catalogOver({
      buckets: [
        bucket(SwapKitProviderEnum.MayachainStreaming, [
          { chain: 'BTC' } as TokenEntryType,
          { identifier: 'X.X' } as TokenEntryType,
          token('BTC.BTC'),
        ]),
      ],
    });

    expect(identifiers(await catalog.listTokens())).toEqual(['BTC.BTC']);
  });

  it('puts the assets people actually swap at the top', async () => {
    const { catalog } = catalogOver({
      buckets: [
        bucket(SwapKitProviderEnum.MayachainStreaming, [
          token('XYZ.ZEBRA', {
            ticker: 'ZEBRA',
            symbol: 'ZEBRA',
            name: 'Zebra',
          }),
          token('BTC.BTC'),
          token('ETH.ETH'),
        ]),
      ],
    });

    expect(identifiers(await catalog.listTokens())).toEqual([
      'BTC.BTC',
      'ETH.ETH',
      'XYZ.ZEBRA',
    ]);
  });
});

describe('routability', () => {
  const buckets: TokensResponseType = [
    bucket(SwapKitProviderEnum.MayachainStreaming, [
      token('BTC.BTC'),
      token('DOGE.DOGE'),
    ]),
    bucket(SwapKitProviderEnum.Near, [token('near.near')]),
  ];

  it('trims the picker to what SwapKit says routes in that direction', async () => {
    const { catalog } = catalogOver({
      buckets,
      swapTo: ['BTC.BTC'],
      swapFrom: ['DOGE.DOGE'],
    });

    expect(identifiers(await catalog.listRoutableTokens('outbound'))).toEqual([
      'BTC.BTC',
    ]);
    expect(identifiers(await catalog.listRoutableTokens('inbound'))).toEqual([
      'DOGE.DOGE',
    ]);
  });

  // The regression this suite exists for. NEAR ships lowercase identifiers in
  // /tokens and canonical uppercase from the routability endpoints, so an
  // exact match dropped every NEAR asset from the picker without a word.
  it('matches across the casing SwapKit varies between its own endpoints', async () => {
    const { catalog } = catalogOver({ buckets, swapTo: ['NEAR.NEAR'] });

    expect(identifiers(await catalog.listRoutableTokens('outbound'))).toEqual([
      'near.near',
    ]);
  });

  // The identifier goes on to /v3/quote, so trimming the list must not rewrite
  // what the provider is asked about.
  it('leaves the identifier in the casing the provider expects', async () => {
    const { catalog } = catalogOver({ buckets, swapTo: ['NEAR.NEAR'] });
    const [routable] = await catalog.listRoutableTokens('outbound');

    expect(routable.identifier).toBe('near.near');
  });

  // Showing too much beats showing nothing: the user finds out at quote time,
  // which is a worse experience than a trimmed list but a far better one than
  // an empty picker.
  it('falls back to the whole catalog when the routability call fails', async () => {
    const { catalog } = catalogOver({
      buckets,
      swapTo: new Error('503'),
      swapFrom: ['DOGE.DOGE'],
    });

    expect(await catalog.listRoutableTokens('outbound')).toHaveLength(3);
    expect(identifiers(await catalog.listRoutableTokens('inbound'))).toEqual([
      'DOGE.DOGE',
    ]);
  });

  // /tokens is the one the picker cannot work without, so its failure is the
  // caller's to surface rather than something to paper over.
  it("raises the catalog's own failure to the caller", async () => {
    const client = {
      tokens: jest.fn(async () => {
        throw new Error('edge blocked');
      }),
      swapTo: jest.fn(async () => []),
      swapFrom: jest.fn(async () => []),
    };
    const catalog = new TokenCatalog(client as unknown as SwapKitClient);

    await expect(catalog.listTokens()).rejects.toThrow('edge blocked');
  });
});

describe('fetching', () => {
  const buckets: TokensResponseType = [
    bucket(SwapKitProviderEnum.MayachainStreaming, [token('BTC.BTC')]),
  ];

  // /tokens is about a megabyte, so a screen that mounts twice must not pay
  // for it twice.
  it('fetches once and serves the rest from memory', async () => {
    const { catalog, client } = catalogOver({ buckets });

    await catalog.listTokens();
    await catalog.listTokens();

    expect(client.tokens).toHaveBeenCalledTimes(1);
  });

  it('joins callers that arrive while the first fetch is still in flight', async () => {
    const { catalog, client } = catalogOver({ buckets });

    await Promise.all([
      catalog.listTokens(),
      catalog.listTokens(),
      catalog.listTokens(),
    ]);

    expect(client.tokens).toHaveBeenCalledTimes(1);
  });

  it('fetches again after the cache is dropped', async () => {
    const { catalog, client } = catalogOver({ buckets });

    await catalog.listTokens();
    catalog.invalidate();
    await catalog.listTokens();

    expect(client.tokens).toHaveBeenCalledTimes(2);
  });

  it('asks for the catalog and both routability lists together', async () => {
    const { catalog, client } = catalogOver({ buckets });

    await catalog.listTokens();

    expect(client.swapTo).toHaveBeenCalledWith('ZEC.ZEC');
    expect(client.swapFrom).toHaveBeenCalledWith('ZEC.ZEC');
  });
});

describe('routableChains', () => {
  const buckets = [bucket(SwapKitProviderEnum.Near, [token('ETH.ETH')])];

  // What the address book offers: chains that swap with ZEC either way.
  it('gives the chains of both routability lists, plus ZEC', async () => {
    const { catalog } = catalogOver({
      buckets,
      swapTo: ['TRON.USDT-TR7', 'eth.eth'],
      swapFrom: ['BTC.BTC'],
    });
    expect([...((await catalog.routableChains()) ?? [])].sort()).toEqual([
      'BTC',
      'ETH',
      'TRON',
      'ZEC',
    ]);
  });

  it('judges nothing when neither list could be fetched', async () => {
    const { catalog } = catalogOver({
      buckets,
      swapTo: new Error('down'),
      swapFrom: new Error('down'),
    });
    expect(await catalog.routableChains()).toBeNull();
  });
});
