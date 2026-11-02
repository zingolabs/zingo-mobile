import { depositPhase } from '@app/swap';
import type { SwapRecordType } from '@app/swap';

/**
 * What a swap in flight says under its pair, on the card on top of Swap and
 * in Your swaps. A payment not seen by its warning time (longer on a slow
 * chain) reads as a warning. No time shows.
 */
export function pendingSwapLabel(
  record: SwapRecordType,
  nowMs: number,
  t: (key: string) => string,
): { text: string; warning: boolean } {
  switch (depositPhase(record, nowMs)) {
    case 'awaiting':
      return { text: t('swap.pending-waiting'), warning: false };
    case 'looking':
      return { text: t('swap.pending-looking'), warning: false };
    case 'notDetected':
      return { text: t('swap.pending-not-detected'), warning: true };
    case 'detected':
      return { text: t('swap.pending-detected'), warning: false };
    case 'swapping':
      return { text: t('swap.pending-swapping'), warning: false };
  }
}
