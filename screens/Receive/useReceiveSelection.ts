import { useEffect, useRef, useState } from 'react';
import { TransparentAddressClass, UnifiedAddressClass } from '@app/AppState';

/**
 * The address Receive shows: picked once the list and the pin are both known
 * (the pin, else the newest shielded one), then whatever the user picks, and
 * a new address the moment it turns up.
 */
export function useReceiveSelection(
  shielded: UnifiedAddressClass[],
  transparent: TransparentAddressClass[],
  pin: string,
  pinLoaded: boolean,
): [string, (address: string) => void] {
  const [selected, setSelected] = useState<string>('');
  const known = useRef<string[] | null>(null);
  useEffect(() => {
    const list = [...shielded, ...transparent].map(a => a.address);
    if (!pinLoaded || list.length === 0) {
      return;
    }
    if (known.current === null) {
      const newest = shielded.length
        ? shielded[shielded.length - 1].address
        : list[0];
      setSelected(list.includes(pin) ? pin : newest);
    } else {
      const added = list.filter(a => !known.current?.includes(a));
      if (added.length > 0) {
        setSelected(added[added.length - 1]);
      }
    }
    known.current = list;
  }, [shielded, transparent, pin, pinLoaded]);
  return [selected, setSelected];
}
