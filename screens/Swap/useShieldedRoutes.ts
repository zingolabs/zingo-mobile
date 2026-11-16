import { useCallback, useEffect, useState } from 'react';
import {
  SwapDirectionEnum,
  SwapKitProviderEnum,
  chainCarriesShieldedPurchase,
  fetchMayaShieldedMemoTarget,
  routeIsShielded,
} from '@app/swap';

/** What the routes sheet says about shielded routes under its list. */
export type ShieldedNoteType = 'purchase' | 'refund' | 'none' | null;

/**
 * Which routes land shielded, and the note that goes with them. A sale asks
 * mayanode once whether Maya takes a shielded memo: without one the refund
 * cannot name a unified address, so nothing is offered.
 */
export function useShieldedRoutes(args: {
  direction: SwapDirectionEnum;
  sellChain: string;
  providers: readonly SwapKitProviderEnum[];
}): {
  isShielded: (provider: SwapKitProviderEnum) => boolean;
  note: ShieldedNoteType;
} {
  const { direction, sellChain, providers } = args;
  const sale = direction === SwapDirectionEnum.Outbound;
  const [shieldedMemoOn, setShieldedMemoOn] = useState<boolean>(false);

  useEffect(() => {
    if (!sale) {
      return;
    }
    let cancelled = false;
    fetchMayaShieldedMemoTarget()
      .then(target => {
        if (!cancelled) {
          setShieldedMemoOn(!!target);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sale]);

  const isShielded = useCallback(
    (provider: SwapKitProviderEnum) =>
      routeIsShielded({ provider, direction, sellChain, shieldedMemoOn }),
    [direction, sellChain, shieldedMemoOn],
  );

  const note: ShieldedNoteType = providers.some(isShielded)
    ? sale
      ? 'refund'
      : 'purchase'
    : !sale && !!sellChain && !chainCarriesShieldedPurchase(sellChain)
      ? 'none'
      : null;

  return { isShielded, note };
}
