import { useSyncExternalStore } from 'react';
import { clockMs, subscribeClock } from '@app/time/clock';

/** The minute the wall clock last struck. */
export function useNowMs(): number {
  return useSyncExternalStore(subscribeClock, clockMs);
}
