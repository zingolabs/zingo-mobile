import { useEffect, useRef, useState } from 'react';
import type { ValueTransferType } from '@app/AppState';
import { duration } from '@app/theme/motion';

/**
 * The transactions that turned up while History was open: what was there at
 * the first load is not new, and a row is new for a moment only.
 */
export function useFreshRows(
  valueTransfers: ValueTransferType[] | null,
): ReadonlySet<string> {
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    if (!valueTransfers) {
      return;
    }
    const ids = valueTransfers.map(vt => vt.txid);
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const known = seen.current;
    const added = ids.filter(id => !known.has(id));
    added.forEach(id => known.add(id));
    if (added.length === 0) {
      return;
    }
    setFresh(new Set(added));
    const timer = setTimeout(
      () => setFresh(new Set()),
      duration.fresh + duration.base,
    );
    return () => clearTimeout(timer);
  }, [valueTransfers]);

  return fresh;
}
