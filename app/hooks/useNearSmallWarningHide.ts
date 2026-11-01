import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Per app, whatever the wallet: the warning is about NEAR, not about a wallet. */
export const NEAR_SMALL_WARNING_HIDDEN_KEY = 'swap:near-small-warning:hidden';

type HideState = { loaded: boolean; hidden: boolean };

let shared: HideState = { loaded: false, hidden: false };
const listeners = new Set<(state: HideState) => void>();
const publish = (next: HideState) => {
  shared = next;
  listeners.forEach(listener => listener(next));
};

/** Whether the user asked not to see NEAR's no-refunds warning again. */
export function useNearSmallWarningHide(): HideState & {
  setHidden: (hidden: boolean) => void;
} {
  const [state, setState] = useState<HideState>(shared);

  useEffect(() => {
    listeners.add(setState);
    if (!shared.loaded) {
      AsyncStorage.getItem(NEAR_SMALL_WARNING_HIDDEN_KEY)
        .then(stored => publish({ loaded: true, hidden: stored === '1' }))
        .catch(() => publish({ loaded: true, hidden: false }));
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const setHidden = (hidden: boolean) => {
    publish({ loaded: true, hidden });
    (hidden
      ? AsyncStorage.setItem(NEAR_SMALL_WARNING_HIDDEN_KEY, '1')
      : AsyncStorage.removeItem(NEAR_SMALL_WARNING_HIDDEN_KEY)
    ).catch(error =>
      console.log(`Hiding the NEAR no-refunds warning failed: ${error}`),
    );
  };

  return { ...state, setHidden };
}
