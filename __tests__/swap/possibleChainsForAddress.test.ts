import { ChainNameEnum } from '@app/swap/enums/ChainNameEnum';
import { possibleChainsForAddress } from '@app/swap/possibleChainsForAddress';

// No address here is a Zcash one.
jest.mock('@app/utils', () => ({
  __esModule: true,
  default: { isValidAddress: async () => ({ isValid: false }) },
}));

const chainsOf = (address: string) =>
  possibleChainsForAddress(address, ChainNameEnum.mainChainName);

// Almost any lowercase string is a valid NEAR name, so NEAR is offered for an
// ambiguous one only when no other chain takes it.
describe('possibleChainsForAddress and NEAR', () => {
  it('offers NEAR for a form that can only be NEAR', async () => {
    expect(await chainsOf('alice.tg')).toEqual(['NEAR']);
    expect(await chainsOf('zingo.near')).toEqual(['NEAR']);
  });

  it('offers NEAR for a name no other chain takes', async () => {
    expect(await chainsOf('aurora')).toEqual(['NEAR']);
  });

  it('leaves NEAR out when another chain takes the address', async () => {
    expect(
      await chainsOf('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4'),
    ).toEqual(['BTC']);
    const thor = await chainsOf('thor1' + 'q'.repeat(38));
    expect(thor).toContain('THOR');
    expect(thor).not.toContain('NEAR');
    expect(
      await chainsOf('0x85f17cf997934a597031b2e18a9ab6ebd4b9f6a4'),
    ).not.toContain('NEAR');
  });
});
