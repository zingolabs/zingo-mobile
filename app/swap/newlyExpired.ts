import { SwapStatusEnum } from './enums/SwapStatusEnum';
import { SwapRecordType } from './types/SwapRecordType';

/**
 * The swaps that just ran out of time: expired now, awaiting their deposit
 * the last time they were seen. A swap already expired when first seen, as
 * after a launch, is left out.
 */
export function newlyExpired(
  seen: ReadonlyMap<string, SwapStatusEnum>,
  records: ReadonlyArray<SwapRecordType>,
): SwapRecordType[] {
  return records.filter(
    record =>
      record.status === SwapStatusEnum.Expired &&
      seen.get(record.recordId) === SwapStatusEnum.AwaitingExternalDeposit,
  );
}
