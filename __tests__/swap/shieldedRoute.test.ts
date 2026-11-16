import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';
import { routeIsShielded, swapAddressOf } from '@app/swap/shieldedPurchase';

const maya = SwapKitProviderEnum.MayachainStreaming;
const buy = SwapDirectionEnum.Inbound;
const sell = SwapDirectionEnum.Outbound;

describe('routeIsShielded', () => {
  it('Tests that a Maya purchase from a long-memo chain lands shielded', () => {
    expect(
      routeIsShielded({
        provider: maya,
        direction: buy,
        sellChain: 'ETH',
        shieldedMemoOn: false,
      }),
    ).toBe(true);
  });

  it('Tests that a purchase is not shielded when paid with BTC or DASH, or through another provider', () => {
    for (const sellChain of ['BTC', 'DASH']) {
      expect(
        routeIsShielded({
          provider: maya,
          direction: buy,
          sellChain,
          shieldedMemoOn: true,
        }),
      ).toBe(false);
    }
    expect(
      routeIsShielded({
        provider: SwapKitProviderEnum.Near,
        direction: buy,
        sellChain: 'ETH',
        shieldedMemoOn: true,
      }),
    ).toBe(false);
  });

  it('Tests that a Maya sale refunds shielded only while Maya takes a shielded memo', () => {
    const sale = { provider: maya, direction: sell, sellChain: 'ZEC' };
    expect(routeIsShielded({ ...sale, shieldedMemoOn: true })).toBe(true);
    expect(routeIsShielded({ ...sale, shieldedMemoOn: false })).toBe(false);
  });
});

describe('swapAddressOf', () => {
  it('Tests that a purchase paid to a unified address made that address', () => {
    expect(swapAddressOf({ direction: buy, destinationAddress: 'u1new' })).toBe(
      'u1new',
    );
    expect(
      swapAddressOf({ direction: buy, destinationAddress: 't1old' }),
    ).toBeUndefined();
  });

  it('Tests that a sale made its refund address and nothing else', () => {
    expect(
      swapAddressOf({
        direction: sell,
        destinationAddress: '0xabc',
        refundAddress: 'u1refund',
      }),
    ).toBe('u1refund');
    expect(
      swapAddressOf({ direction: sell, destinationAddress: '0xabc' }),
    ).toBeUndefined();
  });
});
