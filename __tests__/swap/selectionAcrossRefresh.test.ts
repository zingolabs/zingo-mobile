import { selectionAcrossRefresh } from '@app/swap/selectionAcrossRefresh';
import { RouteOptionType } from '@app/swap/types/RouteOptionType';

const route = (routeId: string, provider: string, tags?: string[]) =>
  ({ routeId, provider, tags }) as RouteOptionType;

const shown = [
  route('old-near', 'NEAR'),
  route('old-flash', 'FLASHNET', ['RECOMMENDED']),
];

describe('selectionAcrossRefresh', () => {
  it("carries a user's pick across by provider, not by route id", () => {
    const fresh = [
      route('new-near', 'NEAR', ['RECOMMENDED']),
      route('new-flash', 'FLASHNET'),
    ];
    expect(
      selectionAcrossRefresh({
        pickedRouteId: 'old-flash',
        pickedByUser: true,
        shownRoutes: shown,
        freshRoutes: fresh,
      }),
    ).toEqual({ routeId: 'new-flash' });
  });

  it('follows the new optimum where the user chose nothing', () => {
    const fresh = [
      route('new-near', 'NEAR', ['RECOMMENDED']),
      route('new-flash', 'FLASHNET'),
    ];
    expect(
      selectionAcrossRefresh({
        pickedRouteId: 'old-flash',
        pickedByUser: false,
        shownRoutes: shown,
        freshRoutes: fresh,
      }),
    ).toEqual({ routeId: 'new-near' });
  });

  // The one that bit: a pick replaced by another provider is a different
  // counterparty for the user's money, shown as if they had asked for it.
  it('drops a pick whose provider stopped quoting rather than moving it', () => {
    const fresh = [route('new-near', 'NEAR', ['RECOMMENDED'])];
    expect(
      selectionAcrossRefresh({
        pickedRouteId: 'old-flash',
        pickedByUser: true,
        shownRoutes: shown,
        freshRoutes: fresh,
      }),
    ).toEqual({ routeId: '', droppedProvider: 'FLASHNET' });
  });

  it('names no provider when the refresh brought back nothing at all', () => {
    expect(
      selectionAcrossRefresh({
        pickedRouteId: 'old-flash',
        pickedByUser: true,
        shownRoutes: shown,
        freshRoutes: [],
      }),
    ).toEqual({ routeId: '' });
  });
});
