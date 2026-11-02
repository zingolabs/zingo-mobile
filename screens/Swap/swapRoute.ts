import { Route } from '@app/AppState';
import {
  SwapStatusEnum,
  isRefunding,
  isTerminalStatus,
  unsentSale,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';

/**
 * The screen a swap opens on, by where it stands: its deposit while that is
 * still to pay or a sale's ZEC has not left, its tracking while it moves or
 * a payment said sent is looked for, its detail once it stopped or when a
 * late payment is on its way back.
 */
export function swapScreenFor(
  record: Pick<
    SwapRecordType,
    'direction' | 'status' | 'lateDepositAtMs' | 'depositSentAtMs'
  >,
):
  | typeof Route.SwapDeposit
  | typeof Route.SwapTracking
  | typeof Route.SwapDetail {
  if (isTerminalStatus(record.status) || isRefunding(record)) {
    return Route.SwapDetail;
  }
  const toPay =
    record.status === SwapStatusEnum.AwaitingExternalDeposit &&
    record.depositSentAtMs === undefined;
  return toPay || unsentSale(record) ? Route.SwapDeposit : Route.SwapTracking;
}
