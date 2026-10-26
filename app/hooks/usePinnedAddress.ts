import { useEffect, useState } from 'react';
import {
  readPinnedAddress,
  writePinnedAddress,
} from '@app/services/ReceivePinImpl';

type PinState = { loaded: boolean; pin: string };

/** Shared by Receive and Your addresses, so a pin set in one shows in both. */
let shared: PinState = { loaded: false, pin: '' };
const listeners = new Set<(state: PinState) => void>();
const publish = (next: PinState) => {
  shared = next;
  listeners.forEach(listener => listener(next));
};

/**
 * The address pinned in Receive for the loaded wallet: read once from
 * storage, then kept in memory; `setPin('')` unpins.
 */
export function usePinnedAddress(): PinState & {
  setPin: (address: string) => void;
} {
  const [state, setState] = useState<PinState>(shared);

  useEffect(() => {
    listeners.add(setState);
    if (!shared.loaded) {
      readPinnedAddress()
        .then(pin => publish({ loaded: true, pin }))
        .catch(() => publish({ loaded: true, pin: '' }));
    }
    return () => {
      listeners.delete(setState);
    };
  }, []);

  const setPin = (address: string) => {
    publish({ loaded: true, pin: address });
    writePinnedAddress(address).catch(error =>
      console.log(`Pinning the address failed: ${error}`),
    );
  };

  return { ...state, setPin };
}

/** Forgets the pin held in memory, for when another wallet loads. */
export function resetPinnedAddress() {
  publish({ loaded: false, pin: '' });
}
