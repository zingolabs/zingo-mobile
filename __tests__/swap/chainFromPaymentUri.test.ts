import { chainFromPaymentUri } from '@app/swap/chainFromPaymentUri';

const EVM = '0x1111111111111111111111111111111111111111';

describe('chainFromPaymentUri', () => {
  it('names the chain a scheme stands for', () => {
    expect(chainFromPaymentUri('bitcoin:bc1qexample?amount=0.1')).toBe('BTC');
    expect(chainFromPaymentUri('litecoin:ltc1qexample')).toBe('LTC');
    expect(chainFromPaymentUri('solana:So1ana?amount=1')).toBe('SOL');
    expect(chainFromPaymentUri('ton://transfer/EQabc?amount=1')).toBe('TON');
    expect(chainFromPaymentUri('zcash:u1abc?amount=1')).toBe('ZEC');
  });

  // Every EVM chain shares one address format; the chain id settles it.
  it('reads the EVM chain from an EIP-681 chain id', () => {
    expect(chainFromPaymentUri(`ethereum:${EVM}@8453?value=1`)).toBe('BASE');
    expect(chainFromPaymentUri(`ethereum:${EVM}@42161`)).toBe('ARB');
    expect(
      chainFromPaymentUri(`ethereum:pay-${EVM}@56/transfer?address=0x2`),
    ).toBe('BSC');
  });

  it('takes an EIP-681 link without a chain id as Ethereum mainnet', () => {
    expect(chainFromPaymentUri(`ethereum:${EVM}?value=1`)).toBe('ETH');
  });

  it('names nothing for a bare address, an unknown scheme or an unknown chain id', () => {
    expect(chainFromPaymentUri(EVM)).toBeUndefined();
    expect(chainFromPaymentUri('bc1qexample')).toBeUndefined();
    expect(chainFromPaymentUri('https://example.com')).toBeUndefined();
    expect(chainFromPaymentUri(`ethereum:${EVM}@999999`)).toBeUndefined();
  });
});
