import { Route } from '@app/AppState';
import { SwapStatusEnum, isTerminalStatus } from '@app/swap';

/** The screen a swap opens on, by where it stands. */
export function swapScreenFor(
  status: SwapStatusEnum,
):
  | typeof Route.SwapDeposit
  | typeof Route.SwapTracking
  | typeof Route.SwapDetail {
  if (isTerminalStatus(status)) {
    return Route.SwapDetail;
  }
  return status === SwapStatusEnum.AwaitingExternalDeposit
    ? Route.SwapDeposit
    : Route.SwapTracking;
}
