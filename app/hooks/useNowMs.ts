import { useSyncExternalStore } from 'react';
import { clockMs, subscribeClock } from '@app/time/clock';

/** The current minute of the wall clock, as its start in milliseconds. */
export function useNowMs(): number {
  return useSyncExternalStore(subscribeClock, clockMs);
}
