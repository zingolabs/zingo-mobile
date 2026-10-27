import { Route } from '@app/AppState';
import { SwapStatusEnum, isRefunding, isTerminalStatus } from '@app/swap';
import type { SwapRecordType } from '@app/swap';

/**
 * The screen a swap opens on, by where it stands: its deposit while that is
 * awaited, its tracking while it moves, its detail once it stopped or when a
 * late payment is on its way back.
 */
export function swapScreenFor(
  record: Pick<SwapRecordType, 'status' | 'lateDepositAtMs'>,
):
  | typeof Route.SwapDeposit
  | typeof Route.SwapTracking
  | typeof Route.SwapDetail {
  if (isTerminalStatus(record.status) || isRefunding(record)) {
    return Route.SwapDetail;
  }
  return record.status === SwapStatusEnum.AwaitingExternalDeposit
    ? Route.SwapDeposit
    : Route.SwapTracking;
}
