/**
 * ZNS resolution for the Send recipient field.
 *
 * The SDK itself is the auto-mock in `__mocks__/zcashname-sdk.js` (its real
 * CommonJS build cannot load under jest), so `resolveName` is steered per
 * test through the prototype.
 */
import { ZNS } from 'zcashname-sdk';
import { ChainNameEnum } from '@app/AppState';
import { isZnsAlias, resolveZnsName } from '@app/uris/resolveZnsName';

const UA = 'u1abcdefghijklmnopqrstuvwxyz0123456789';

describe('isZnsAlias', () => {
  it.each([
    'alice.zcash',
    'ALICE.ZCASH',
    '  bob123.zcash  ',
    'a.zcash',
    // Edge hands out names in this form, against the same registry: the
    // indexer is asked for the bare name either way.
    'alice.zec',
    'ALICE.ZEC',
    '  bob123.zec  ',
  ])('accepts %s', text => {
    expect(isZnsAlias(text)).toBe(true);
  });

  it.each([
    ['a bare name', 'alice'],
    ['a unified address', UA],
    ['an empty name', '.zcash'],
    ['an empty name under the other suffix', '.zec'],
    ['a name with symbols', 'al_ice.zcash'],
    ['a name over 62 characters', `${'a'.repeat(63)}.zcash`],
    ['nothing', ''],
    // The list of suffixes is closed on purpose: one nobody issues is a
    // mistyped address, and resolving it would hand back someone else's.
    ['a suffix nobody issues', 'alice.zzzzzzzzzzz'],
    ['a domain', 'alice.com'],
    ['both suffixes at once', 'alice.zcash.zec'],
  ])('rejects %s', (_label, text) => {
    expect(isZnsAlias(text)).toBe(false);
  });
});

describe('resolveZnsName', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('answers the address a registered name points at', async () => {
    jest
      .spyOn(ZNS.prototype, 'resolveName')
      .mockResolvedValue({ address: UA } as never);

    await expect(
      resolveZnsName('alice.zcash', ChainNameEnum.mainChainName),
    ).resolves.toEqual({ ok: true, address: UA });
  });

  it('strips the suffix before asking the indexer', async () => {
    const resolveName = jest
      .spyOn(ZNS.prototype, 'resolveName')
      .mockResolvedValue({ address: UA } as never);

    await resolveZnsName('  ALICE.zcash ', ChainNameEnum.mainChainName);

    expect(resolveName).toHaveBeenCalledWith('alice');
  });

  // The suffix never reaches the indexer, so both forms are one lookup.
  it('asks for the same name whichever suffix was written', async () => {
    const resolveName = jest
      .spyOn(ZNS.prototype, 'resolveName')
      .mockResolvedValue({ address: UA } as never);

    await resolveZnsName('  ALICE.zec ', ChainNameEnum.mainChainName);

    expect(resolveName).toHaveBeenCalledWith('alice');
  });

  it('reports an unregistered name as not-found', async () => {
    jest.spyOn(ZNS.prototype, 'resolveName').mockResolvedValue(null as never);

    await expect(
      resolveZnsName('nobody.zcash', ChainNameEnum.mainChainName),
    ).resolves.toEqual({ ok: false, reason: 'not-found' });
  });

  it('reports a registration without an address as not-found', async () => {
    jest.spyOn(ZNS.prototype, 'resolveName').mockResolvedValue({} as never);

    await expect(
      resolveZnsName('alice.zcash', ChainNameEnum.mainChainName),
    ).resolves.toEqual({ ok: false, reason: 'not-found' });
  });

  it('never throws when the indexer does', async () => {
    jest
      .spyOn(ZNS.prototype, 'resolveName')
      .mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      resolveZnsName('alice.zcash', ChainNameEnum.mainChainName),
    ).resolves.toEqual({ ok: false, reason: 'network' });
  });

  it('does not reach the indexer on regtest, which has none', async () => {
    const resolveName = jest.spyOn(ZNS.prototype, 'resolveName');

    await expect(
      resolveZnsName('alice.zcash', ChainNameEnum.regtestChainName),
    ).resolves.toEqual({ ok: false, reason: 'unsupported-chain' });
    expect(resolveName).not.toHaveBeenCalled();
  });

  it('does not reach the indexer for a name the protocol would refuse', async () => {
    const resolveName = jest.spyOn(ZNS.prototype, 'resolveName');

    await expect(
      resolveZnsName('al_ice.zcash', ChainNameEnum.mainChainName),
    ).resolves.toEqual({ ok: false, reason: 'not-found' });
    expect(resolveName).not.toHaveBeenCalled();
  });
});
