import { useEffect, useRef, useState } from 'react';
import { TransparentAddressClass, UnifiedAddressClass } from '@app/AppState';

const NO_SWAP_ADDRESSES: ReadonlySet<string> = new Set();

/**
 * The address Receive shows: picked once the list and the pin are both known
 * (the pin, else the newest shielded one you made), then whatever the user
 * picks, and a new address of yours the moment it turns up.
 */
export function useReceiveSelection(
  shielded: UnifiedAddressClass[],
  transparent: TransparentAddressClass[],
  pin: string,
  pinLoaded: boolean,
  /** Addresses a swap made: Receive never opens on one by itself. */
  swapAddresses: ReadonlySet<string> = NO_SWAP_ADDRESSES,
): [string, (address: string) => void] {
  const [selected, setSelected] = useState<string>('');
  const known = useRef<string[] | null>(null);
  useEffect(() => {
    const list = [...shielded, ...transparent].map(a => a.address);
    if (!pinLoaded || list.length === 0) {
      return;
    }
    if (known.current === null) {
      const yours = shielded.filter(a => !swapAddresses.has(a.address));
      const newest = yours.length ? yours[yours.length - 1].address : list[0];
      setSelected(list.includes(pin) ? pin : newest);
    } else {
      const added = list.filter(
        a => !known.current?.includes(a) && !swapAddresses.has(a),
      );
      if (added.length > 0) {
        setSelected(added[added.length - 1]);
      }
    }
    known.current = list;
  }, [shielded, transparent, pin, pinLoaded, swapAddresses]);
  return [selected, setSelected];
}
