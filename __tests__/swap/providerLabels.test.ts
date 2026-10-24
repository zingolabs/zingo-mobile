import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { providerCustody } from '@app/swap/providerLabels';

describe('providerCustody', () => {
  it('names the vault for the THORChain family', () => {
    expect(providerCustody(SwapKitProviderEnum.ThorchainStreaming)?.label).toBe(
      'vault',
    );
    expect(providerCustody(SwapKitProviderEnum.MayachainStreaming)?.label).toBe(
      'vault',
    );
  });

  it('names the operator for the channel providers', () => {
    expect(providerCustody(SwapKitProviderEnum.Near)?.label).toBe('operator');
    expect(providerCustody(SwapKitProviderEnum.Flashnet)?.label).toBe(
      'operator',
    );
  });

  // A provider nobody has looked at gets no word rather than a guess.
  it('says nothing about a provider it has not been told about', () => {
    expect(providerCustody(SwapKitProviderEnum.Chainflip)).toBeUndefined();
  });
});
