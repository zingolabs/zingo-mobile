import { optimalRouteId } from '@app/swap/optimalRoute';
import { RouteOptionType } from '@app/swap/types/RouteOptionType';

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
});
