import { useEffect, useState } from 'react';
import {
  IronwoodNoticeHide,
  readIronwoodNoticeHide,
  writeIronwoodNoticeHide,
} from '@app/services/IronwoodNoticeImpl';

type HideState = { loaded: boolean; hide: IronwoodNoticeHide };

const SHOWN: IronwoodNoticeHide = { kind: 'shown' };

let shared: HideState = { loaded: false, hide: SHOWN };
const listeners = new Set<(state: HideState) => void>();
const publish = (next: HideState) => {
  shared = next;
  listeners.forEach(listener => listener(next));
};

/**
 * Whether the loaded wallet hid the Ironwood notice: read once from storage,
 * then kept in memory.
 */
export function useIronwoodNoticeHide(): HideState & {
  setHide: (hide: IronwoodNoticeHide) => void;
} {
  const [state, setState] = useState<HideState>(shared);

  useEffect(() => {
    listeners.add(setState);
    if (!shared.loaded) {
      readIronwoodNoticeHide()
        .then(hide => publish({ loaded: true, hide }))
        .catch(() => publish({ loaded: true, hide: SHOWN }));
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const setHide = (hide: IronwoodNoticeHide) => {
    publish({ loaded: true, hide });
    writeIronwoodNoticeHide(hide).catch(error =>
      console.log(`Hiding the Ironwood notice failed: ${error}`),
    );
  };

  return { ...state, setHide };
}

/** Forgets what is held in memory, for when another wallet loads. */
export function resetIronwoodNoticeHide() {
  publish({ loaded: false, hide: SHOWN });
}
