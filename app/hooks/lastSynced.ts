import { useSyncExternalStore } from 'react';
import {
  SyncFreshness,
  getFreshness,
  subscribeFreshness,
} from '@app/walletBackend/utils/syncFreshness';

/** The wallet's heights and the last moment it was seen at the tip. */
export function useSyncFreshness(): SyncFreshness {
  return useSyncExternalStore(subscribeFreshness, getFreshness);
}
