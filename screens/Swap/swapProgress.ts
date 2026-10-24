import { SwapStatusEnum } from '@app/swap/enums/SwapStatusEnum';

/** The three steps a swap walks, as the tracking screen draws them. */
export const SWAP_STEP_COUNT = 3;

/**
 * Which step a status sits on: 0 while the deposit is on its way, 1 while
 * the provider swaps, 2 once it paid out. A step is `done` below the current
 * one, `now` at it, and `next` above it.
 */
export function swapStepIndex(status: SwapStatusEnum): number {
  switch (status) {
    case SwapStatusEnum.PendingDeposit:
    case SwapStatusEnum.AwaitingExternalDeposit:
      return 0;
    case SwapStatusEnum.Completed:
      return SWAP_STEP_COUNT;
    default:
      return 1;
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

/** How long a deposit address waits for its payment. */
export const DEPOSIT_WINDOW_MS = 15 * 60 * 1000;

/** When the deposit must be paid by: the route's expiry, or the window. */
export function depositDeadlineMs(record: {
  createdAtMs: number;
  expiresAtMs?: number;
}): number {
  return record.expiresAtMs ?? record.createdAtMs + DEPOSIT_WINDOW_MS;
}

/** `m:ss` of what is left, never below zero. */
export function countdownText(remainingMs: number): string {
  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
