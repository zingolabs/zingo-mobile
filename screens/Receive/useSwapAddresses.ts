import { useMemo } from 'react';
import { useSwapRecords } from '@app/context';
import { swapAddressOf } from '@app/swap';
import type { SwapRecordType } from '@app/swap';

/**
 * The wallet's addresses a swap made, each with its swap. The record links
 * them, so an address leaves this list when its swap is removed.
 */
export function useSwapAddresses(): ReadonlyMap<string, SwapRecordType> {
  const records = useSwapRecords();
  return useMemo(() => {
    const byAddress = new Map<string, SwapRecordType>();
    for (const record of records) {
      const address = swapAddressOf(record);
      if (address) {
        byAddress.set(address, record);
      }
    }
    return byAddress;
  }, [records]);
}
