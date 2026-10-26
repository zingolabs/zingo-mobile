import { depositDeadlineMs, depositPhase } from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { countdownText } from './swapProgress';

/**
 * What a swap in flight says under its pair, on the card on top of Swap and
 * in Your swaps. While the deposit is awaited it carries the time left; past
 * half of it with nothing seen, the line is a warning.
 */
export function pendingSwapLabel(
  record: SwapRecordType,
  nowMs: number,
  t: (key: string) => string,
): { text: string; warning: boolean } {
  const phase = depositPhase(record, nowMs);
  const left = t('swap.pending-time-left').replace(
    '{time}',
    countdownText(depositDeadlineMs(record) - nowMs),
  );
  switch (phase) {
    case 'awaiting':
      return { text: `${t('swap.pending-waiting')} · ${left}`, warning: false };
    case 'looking':
      return { text: `${t('swap.pending-looking')} · ${left}`, warning: false };
    case 'notDetected':
      return {
        text: `${t('swap.pending-not-detected')} · ${left}`,
        warning: true,
      };
    case 'detected':
      return { text: t('swap.pending-detected'), warning: false };
    case 'swapping':
      return { text: t('swap.pending-swapping'), warning: false };
  }
}
