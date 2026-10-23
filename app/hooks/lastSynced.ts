import { useSyncExternalStore } from 'react';

/**
 * When the wallet was last seen fully synced, for "balance from 4 min ago".
 * Kept in memory for the session: every header's sync line marks it while
 * it sees the wallet synced, and reads it once the connection goes.
 */
let syncedAtMs = 0;
const listeners = new Set<() => void>();

export function markSynced(nowMs: number): void {
  syncedAtMs = nowMs;
  listeners.forEach(listener => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Milliseconds since the epoch, or 0 while this session has not seen a sync. */
export function useLastSynced(): number {
  return useSyncExternalStore(subscribe, () => syncedAtMs);
}
