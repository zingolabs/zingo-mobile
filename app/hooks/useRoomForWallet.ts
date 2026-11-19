import { useEffect, useState } from 'react';
import {
  diskSpace,
  hasRoomForWallet,
  MIN_FREE_BYTES,
} from '@app/walletBackend';

const MB = 1024 * 1024;

/** Whether the device has the free storage a new wallet needs, with the megabytes it asks for when it doesn't. */
export type WalletRoom =
  { kind: 'checking' } | { kind: 'room' } | { kind: 'full'; mb: number };

/** Reads the free storage once, as the screen that saves a wallet mounts. */
export function useRoomForWallet(): WalletRoom {
  const [room, setRoom] = useState<WalletRoom>({ kind: 'checking' });
  useEffect(() => {
    let live = true;
    diskSpace().then(space => {
      if (!live) {
        return;
      }
      if (!space.ok || hasRoomForWallet(space.value)) {
        setRoom({ kind: 'room' });
        return;
      }
      const needed = Math.max(2 * space.value.largest, MIN_FREE_BYTES);
      setRoom({ kind: 'full', mb: Math.ceil(needed / MB) });
    });
    return () => {
      live = false;
    };
  }, []);
  return room;
}
