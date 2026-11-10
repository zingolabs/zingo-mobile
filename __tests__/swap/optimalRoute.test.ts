import { optimalRouteId } from '@app/swap/optimalRoute';
import { RouteOptionType } from '@app/swap/types/RouteOptionType';
import { SwapKitProviderEnum } from '@app/swap/enums/SwapKitProviderEnum';

const route = (routeId: string, tags?: string[]) =>
  ({ routeId, tags }) as RouteOptionType;

describe('optimalRouteId', () => {
  // The tag is the whole point: the picker badges it "Optimal", so anything
  // else selected by default would disagree with what the user is shown.
  it('takes the tagged route wherever it sits in the list', () => {
    expect(
      optimalRouteId([route('a'), route('b', ['RECOMMENDED']), route('c')]),
    ).toBe('b');
  });

  it('ignores the other tags SwapKit sends', () => {
    expect(
      optimalRouteId([
        route('a', ['FASTEST']),
        route('b', ['CHEAPEST', 'RECOMMENDED']),
      ]),
    ).toBe('b');
  });

  // Nothing of ours orders these, so the first is a last resort rather than a
  // second opinion about which is best.
  it('falls back to the first when the quote tags nothing', () => {
    expect(optimalRouteId([route('a'), route('b')])).toBe('a');
  });

  it('answers empty for no routes at all', () => {
    expect(optimalRouteId([])).toBe('');
  });

  describe('paying with a token', () => {
    const priced = (
      routeId: string,
      provider: SwapKitProviderEnum,
      expectedReceiveAmount: string,
      paidWithToken = true,
      tags?: string[],
    ) =>
      ({
        routeId,
        provider,
        expectedReceiveAmount,
        paidWithToken,
        tags,
      }) as RouteOptionType;
    const maya = (paidWithToken = true) =>
      priced(
        'maya',
        SwapKitProviderEnum.MayachainStreaming,
        '0.1043',
        paidWithToken,
        ['RECOMMENDED'],
      );

    it('Tests that the address-only route is selected when it is within 1% of the best', () => {
      const near = priced('near', SwapKitProviderEnum.Near, '0.1036');
      expect(optimalRouteId([maya(), near])).toBe('near');
    });

    it('Tests that the memo route stays selected when the others are more than 1% worse', () => {
      const near = priced('near', SwapKitProviderEnum.Near, '0.1020');
      expect(optimalRouteId([maya(), near])).toBe('maya');
    });

    it('Tests that nothing changes when the payment is not a token', () => {
      const near = priced('near', SwapKitProviderEnum.Near, '0.1036', false);
      expect(optimalRouteId([maya(false), near])).toBe('maya');
    });
  });
});
