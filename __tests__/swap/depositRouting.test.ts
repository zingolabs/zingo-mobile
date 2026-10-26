import {
  depositCarriesMemo,
  depositSpendsSourceAddress,
  zecNetworkFeeReserve,
} from '@app/swap/depositRouting';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';

describe('depositCarriesMemo', () => {
  // Maya and THORChain read which swap a deposit belongs to from its memo,
  // and their refund destination from the transparent origin the second
  // transaction exposes.
  it('is true for the providers whose deposit always carries one', () => {
    expect(depositCarriesMemo(SwapKitProviderEnum.MayachainStreaming)).toBe(
      true,
    );
    expect(depositCarriesMemo(SwapKitProviderEnum.ThorchainStreaming)).toBe(
      true,
    );
  });

  // SwapKit supplies Flashnet's memo or does not, and which it will do is not
  // known when the reserve is computed. Answering true reserves for the
  // dearer shape, which is the safe direction.
  it('is true for Flashnet, which carries one when SwapKit sends one', () => {
    expect(depositCarriesMemo(SwapKitProviderEnum.Flashnet)).toBe(true);
  });

  it('is false for NEAR Intents, which never sends one', () => {
    expect(depositCarriesMemo(SwapKitProviderEnum.Near)).toBe(false);
  });
});

// The send path and the refund-address claim both decide on this, and a
// disagreement between them either reuses an address across swaps or pays
// from one the provider was never told about.
describe('depositSpendsSourceAddress', () => {
  it('is false for an ordinary send', () => {
    expect(depositSpendsSourceAddress({})).toBe(false);
    expect(
      depositSpendsSourceAddress({
        memoBytes: new Uint8Array(),
        viaSourceAddress: false,
      }),
    ).toBe(false);
  });

  it('is true when a memo has to ride in a transparent spend', () => {
    expect(
      depositSpendsSourceAddress({ memoBytes: new Uint8Array([61]) }),
    ).toBe(true);
  });

  it('is true when the provider checks the deposit came from the declared address', () => {
    expect(depositSpendsSourceAddress({ viaSourceAddress: true })).toBe(true);
  });

  // The memo rides in a shielded note, in the send that pays the vault.
  it('is false for a shielded memo deposit', () => {
    expect(
      depositSpendsSourceAddress({
        memoBytes: new Uint8Array([61]),
        shieldedMemoAddress: 'u1mayamemoaddress',
      }),
    ).toBe(false);
  });
});

describe('zecNetworkFeeReserve', () => {
  it('reserves for two transactions when a memo may ride along, and one otherwise', () => {
    expect(
      zecNetworkFeeReserve(SwapKitProviderEnum.MayachainStreaming),
    ).toBeCloseTo(2 * zecNetworkFeeReserve(SwapKitProviderEnum.Near), 12);
    expect(zecNetworkFeeReserve(SwapKitProviderEnum.Flashnet)).toBeCloseTo(
      2 * zecNetworkFeeReserve(SwapKitProviderEnum.Near),
      12,
    );
  });

  // The screen offers "reduce to this amount" from a figure this feeds, so a
  // reserve that drifted into the visible range of a balance would read as the
  // wallet losing money. Both stay well under a thousandth of a ZEC.
  it('stays small enough not to distort the amount offered to the user', () => {
    expect(
      zecNetworkFeeReserve(SwapKitProviderEnum.MayachainStreaming),
    ).toBeLessThan(0.001);
    expect(zecNetworkFeeReserve(SwapKitProviderEnum.Near)).toBeGreaterThan(0);
  });

  // Erring high is the safe direction: too little walks the user into a send
  // that fails after the route is already committed at the provider. ZIP 317
  // charges its 5000-zat marginal fee per logical action past a two-action
  // grace, so a single-transaction deposit cannot plausibly exceed this.
  it('covers a realistic single-transaction deposit', () => {
    expect(
      zecNetworkFeeReserve(SwapKitProviderEnum.Near),
    ).toBeGreaterThanOrEqual(0.0002);
  });

  it('lands on an exact zatoshi count, with no binary-fraction dust', () => {
    const zats = zecNetworkFeeReserve(SwapKitProviderEnum.Near) * 1e8;
    expect(Number.isInteger(Math.round(zats))).toBe(true);
    expect(Math.abs(zats - Math.round(zats))).toBeLessThan(1e-6);
  });
});
