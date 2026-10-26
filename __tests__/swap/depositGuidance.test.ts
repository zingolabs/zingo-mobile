import {
  buildDepositQr,
  exactAmountWarningText,
  memoFieldHintForChain,
  providerRequiresMemo,
  requiresExactAmountWarning,
} from '@app/swap/depositGuidance';
import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import type { SwapAssetType } from '@app/swap/types/SwapAssetType';

const ETH: SwapAssetType = {
  swapKitId: 'ETH.ETH',
  chain: 'ETH',
  symbol: 'ETH',
  ticker: 'ETH',
  chainId: '1',
  decimals: 18,
};

const USDC: SwapAssetType = {
  swapKitId: 'ETH.USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chain: 'ETH',
  symbol: 'USDC-0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  ticker: 'USDC',
  contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  chainId: '1',
  decimals: 6,
};

const BTC: SwapAssetType = {
  swapKitId: 'BTC.BTC',
  chain: 'BTC',
  symbol: 'BTC',
  ticker: 'BTC',
  chainId: 'bitcoin',
  decimals: 8,
};

const NEAR: SwapAssetType = {
  swapKitId: 'NEAR.NEAR',
  chain: 'NEAR',
  symbol: 'NEAR',
  ticker: 'NEAR',
  chainId: 'near',
  decimals: 24,
};

// The shape of a real Mayachain streaming memo: asset, destination, limits.
const MAYA_MEMO = '=:e:0xAA00000000000000000000000000000000000000:0/1/0';

describe('buildDepositQr', () => {
  it('carries address, amount and memo in one URI for an EVM Maya deposit', () => {
    const qr = buildDepositQr({
      sellAsset: ETH,
      depositAddress: '0x1111111111111111111111111111111111111111',
      amountHumanDecimal: '0.001',
      memoText: MAYA_MEMO,
    });
    expect(qr).not.toBeNull();
    expect(qr?.hint).toMatch(
      /Scan this from any wallet that supports payment URIs/,
    );
    expect(qr?.value).toContain(
      'ethereum:0x1111111111111111111111111111111111111111@1',
    );
    expect(qr?.value).toContain('value=1000000000000000');
    // The memo travels as calldata, hex-encoded, never as the raw string.
    expect(qr?.value).toContain('&data=0x');
    expect(qr?.hint).toContain('memo');
  });

  // The failure this guards is silent: a BIP-21 URI cannot express an
  // OP_RETURN, so a QR built from one would look complete while dropping the
  // single field the provider routes on.
  it('returns null rather than a URI that would drop a UTXO memo', () => {
    expect(
      buildDepositQr({
        sellAsset: BTC,
        depositAddress: 'bc1qexampleexampleexampleexampleexampleex',
        amountHumanDecimal: '0.01',
        memoText: MAYA_MEMO,
      }),
    ).toBeNull();
  });

  it('pre-fills the exact amount for a memo-less native deposit', () => {
    const qr = buildDepositQr({
      sellAsset: BTC,
      depositAddress: 'bc1qexampleexampleexampleexampleexampleex',
      amountHumanDecimal: '0.01',
    });
    expect(qr?.hint).toMatch(
      /Scan this from any wallet that supports payment URIs/,
    );
    expect(qr?.value).toBe(
      'bitcoin:bc1qexampleexampleexampleexampleexampleex?amount=0.01',
    );
  });

  // A native-transfer URI for a token would make the wallet send the gas
  // asset. Falling back to an address-only QR is the safe answer: no amount
  // encoded means nothing to get wrong.
  it('falls back to an address-only QR for a token, never a native-transfer URI', () => {
    const qr = buildDepositQr({
      sellAsset: USDC,
      depositAddress: '0x2222222222222222222222222222222222222222',
      amountHumanDecimal: '25',
    });
    expect(qr?.hint).toMatch(
      /type the amount from the row below|enter the exact amount shown below/,
    );
    expect(qr?.value).toBe('0x2222222222222222222222222222222222222222');
    expect(qr?.hint).toContain('by hand');
  });

  it('falls back to an address-only QR on a chain with no payment URI scheme', () => {
    const qr = buildDepositQr({
      sellAsset: NEAR,
      depositAddress: 'deadbeef.near',
      amountHumanDecimal: '5',
    });
    expect(qr?.hint).toMatch(
      /type the amount from the row below|enter the exact amount shown below/,
    );
    expect(qr?.value).toBe('deadbeef.near');
  });

  it('has nothing to show without a deposit address', () => {
    expect(
      buildDepositQr({
        sellAsset: ETH,
        depositAddress: '',
        amountHumanDecimal: '1',
      }),
    ).toBeNull();
  });
});

describe('requiresExactAmountWarning', () => {
  // The channel providers bind a deposit address to one expected amount; a
  // satoshi short is refunded rather than swapped.
  it('warns for the channel-based providers on an inbound deposit', () => {
    expect(
      requiresExactAmountWarning({
        direction: SwapDirectionEnum.Inbound,
        provider: SwapKitProviderEnum.Near,
      }),
    ).toBe(true);
    expect(
      requiresExactAmountWarning({
        direction: SwapDirectionEnum.Inbound,
        provider: SwapKitProviderEnum.Flashnet,
      }),
    ).toBe(true);
  });

  // Maya and THORChain route whatever arrives. Warning there would teach the
  // user to dismiss a banner that matters elsewhere.
  it('stays quiet for Maya and THORChain, which tolerate over- and under-payment', () => {
    expect(
      requiresExactAmountWarning({
        direction: SwapDirectionEnum.Inbound,
        provider: SwapKitProviderEnum.MayachainStreaming,
      }),
    ).toBe(false);
  });

  it('stays quiet outbound, where this wallet pays the exact amount itself', () => {
    expect(
      requiresExactAmountWarning({
        direction: SwapDirectionEnum.Outbound,
        provider: SwapKitProviderEnum.Near,
      }),
    ).toBe(false);
  });
});

describe('exactAmountWarningText', () => {
  it('names the subtract-fee setting on UTXO chains, where it is the usual cause', () => {
    expect(exactAmountWarningText('BTC')).toContain('subtract-fee-from-amount');
  });

  it('keeps the generic wording elsewhere', () => {
    expect(exactAmountWarningText('ETH')).not.toContain(
      'subtract-fee-from-amount',
    );
    expect(exactAmountWarningText('ETH')).toContain('EXACTLY');
  });
});

describe('memoFieldHintForChain', () => {
  // The 2026-06-27 incident: the banner said OP_RETURN while the user paid
  // from an EVM wallet, whose data field defaults to empty.
  it('points EVM chains at the data field, never at OP_RETURN', () => {
    const hint = memoFieldHintForChain('ETH');
    expect(hint).toContain('data (calldata) field');
    expect(hint).not.toContain('OP_RETURN');
  });

  it('points UTXO chains at OP_RETURN', () => {
    expect(memoFieldHintForChain('BTC')).toContain('OP_RETURN');
  });

  it('is case-insensitive about the chain, which arrives from the catalog unnormalised', () => {
    expect(memoFieldHintForChain('eth')).toBe(memoFieldHintForChain('ETH'));
  });

  // Better generic than confidently wrong: an unmapped chain gets phrasing
  // that is true everywhere rather than a guess at its memo slot.
  it('falls back to chain-agnostic wording for a chain it does not know', () => {
    const hint = memoFieldHintForChain('SUI');
    expect(hint).not.toContain('OP_RETURN');
    expect(hint).not.toContain('calldata');
    expect(hint).toContain('memo or data mechanism');
  });
});

describe('providerRequiresMemo', () => {
  it('is true only for the providers that read one off the deposit', () => {
    expect(providerRequiresMemo(SwapKitProviderEnum.MayachainStreaming)).toBe(
      true,
    );
    expect(providerRequiresMemo(SwapKitProviderEnum.ThorchainStreaming)).toBe(
      true,
    );
    expect(providerRequiresMemo(SwapKitProviderEnum.Near)).toBe(false);
    expect(providerRequiresMemo(SwapKitProviderEnum.Flashnet)).toBe(false);
  });
});
