import { SwapDirectionEnum } from '@app/swap/enums/SwapDirectionEnum';
import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';

type Progress = { direction: SwapDirectionEnum; status: SwapStatusEnum };

/**
 * The steps a swap walks, as the tracking screen draws them. A sale has
 * three: the ZEC leaves, the provider swaps, it pays out. A purchase has
 * four: the payment is awaited, then seen, then swapped, then the ZEC lands.
 */
export function swapStepKeys(direction: SwapDirectionEnum): string[] {
  return direction === SwapDirectionEnum.Outbound
    ? ['swap.step-sell-1', 'swap.step-sell-2', 'swap.step-sell-3']
    : [
        'swap.step-buy-1',
        'swap.step-buy-2',
        'swap.step-buy-3',
        'swap.step-buy-4',
      ];
}

/**
 * Which step a swap sits on. A step is `done` below the current one, `now`
 * at it, and `next` above it; a completed swap sits past the last.
 */
export function swapStepIndex({ direction, status }: Progress): number {
  const count = swapStepKeys(direction).length;
  if (status === SwapStatusEnum.Completed) return count;
  if (direction === SwapDirectionEnum.Outbound) {
    return status === SwapStatusEnum.PendingDeposit ? 0 : 1;
  }
  switch (status) {
    case SwapStatusEnum.AwaitingExternalDeposit:
      return 0;
    case SwapStatusEnum.Pending:
      return 1;
    default:
      return 2;
  }
}

/** The screen a record's state lands on once it stops moving. */
export type SwapOutcome =
  'completed' | 'refunded' | 'incomplete' | 'expired' | 'failed' | 'inFlight';

export function swapOutcome(status: SwapStatusEnum): SwapOutcome {
  switch (status) {
    case SwapStatusEnum.Completed:
      return 'completed';
    case SwapStatusEnum.Refunded:
      return 'refunded';
    case SwapStatusEnum.IncompleteDeposit:
      return 'incomplete';
    case SwapStatusEnum.Expired:
      return 'expired';
    case SwapStatusEnum.Failed:
      return 'failed';
    default:
      return 'inFlight';
  }
}

/** `m:ss` of what is left, never below zero. */
export function countdownText(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
