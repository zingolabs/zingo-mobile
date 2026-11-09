import { SwapDirectionEnum } from '@app/swap/SwapDirectionEnum';
import { SwapStatusEnum } from '@app/swap/SwapStatusEnum';

type Progress = {
  direction: SwapDirectionEnum;
  status: SwapStatusEnum;
  /**
   * The provider's deposit is already seen (its hash is known) while the
   * status still awaits it: the payment counts as detected.
   */
  depositSeen?: boolean;
};

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
export function swapStepIndex({
  direction,
  status,
  depositSeen = false,
}: Progress): number {
  const count = swapStepKeys(direction).length;
  if (status === SwapStatusEnum.Completed) return count;
  if (direction === SwapDirectionEnum.Outbound) {
    return status === SwapStatusEnum.PendingDeposit ? 0 : 1;
  }
  switch (status) {
    case SwapStatusEnum.AwaitingExternalDeposit:
      return depositSeen ? 1 : 0;
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

/** The pill a swap's state reads under: the detail's, and its address's. */
export function swapStatePill(
  status: SwapStatusEnum,
  t: (key: string) => string,
): {
  text: string;
  tone: 'accent' | 'warning' | 'danger' | 'neutral';
} {
  switch (swapOutcome(status)) {
    case 'completed':
      return { text: t('swap.history-done'), tone: 'accent' };
    case 'refunded':
      return { text: t('swap.history-refunded'), tone: 'warning' };
    case 'failed':
      return { text: t('swap.history-failed'), tone: 'danger' };
    case 'expired':
      return { text: t('history.state-expired'), tone: 'neutral' };
    default:
      return { text: t('swap.history-in-progress'), tone: 'neutral' };
  }
}
