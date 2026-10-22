import {
  addressFromPaymentUri,
  chainFromPaymentUri,
} from '@app/swap/chainFromPaymentUri';

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

describe('addressFromPaymentUri', () => {
  it('Tests that the bare address comes out when the URI names the field chain', () => {
    expect(addressFromPaymentUri('BTC', 'bitcoin:bc1qexample?amount=0.1')).toBe(
      'bc1qexample',
    );
    expect(addressFromPaymentUri('SOL', ' solana:So1ana?amount=1 ')).toBe(
      'So1ana',
    );
    expect(addressFromPaymentUri('TON', 'ton://transfer/EQabc?amount=1')).toBe(
      'EQabc',
    );
    expect(addressFromPaymentUri('BASE', `ethereum:pay-${EVM}@8453`)).toBe(EVM);
  });

  it('Tests that the recipient, not the token contract, comes out when the URI is a token transfer', () => {
    const token = '0x2222222222222222222222222222222222222222';
    expect(
      addressFromPaymentUri(
        'ETH',
        `ethereum:${token}/transfer?address=${EVM}&uint256=1`,
      ),
    ).toBe(EVM);
    expect(addressFromPaymentUri('ETH', `ethereum:${token}/transfer`)).toBe(
      `ethereum:${token}/transfer`,
    );
  });

  it('Tests that the text is left as it is when the URI names another chain', () => {
    expect(addressFromPaymentUri('ETH', `ethereum:${EVM}@8453`)).toBe(
      `ethereum:${EVM}@8453`,
    );
    expect(addressFromPaymentUri('LTC', 'bitcoin:bc1qexample')).toBe(
      'bitcoin:bc1qexample',
    );
  });

  it('Tests that a plain address is only trimmed when it is not a URI', () => {
    expect(addressFromPaymentUri('BTC', '  bc1qexample ')).toBe('bc1qexample');
  });
});
