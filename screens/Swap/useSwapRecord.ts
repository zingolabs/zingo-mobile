import { useSwapRecords } from '@app/context';
import type { SwapRecordType } from '@app/swap';

/**
 * One swap record by id, kept live by the store: a poller tick that moves
 * the swap reaches the screen without a reopen. `null` once the record is
 * gone, which a removal from the detail produces.
 */
export function useSwapRecord(recordId: string): SwapRecordType | null {
  const records = useSwapRecords();
  return records.find(record => record.recordId === recordId) ?? null;
}
