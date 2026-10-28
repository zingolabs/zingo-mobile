import { useCallback, useContext } from 'react';
import { SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { SwapStore } from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { showConfirm } from '@app/services/showConfirm';
import { swapOutcome } from './swapProgress';

/**
 * Deletes a swap after the user confirms, the sheet saying which swap goes:
 * one with no deposit, a failed one, or a sale that was never sent (the only
 * swaps that can be deleted). `onDone` runs once it is gone.
 */
export function useRemoveSwap(onDone: () => void) {
  const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
  return useCallback(
    (record: SwapRecordType) => {
      const t = (key: string) => (translate(key) as string).trim();
      const outcome = swapOutcome(record.status);
      showConfirm({
        title: t('swap.delete'),
        /** What will happen; the button already says Delete. */
        message: t(
          outcome === 'expired'
            ? 'swap.delete-expired-body'
            : outcome === 'failed'
              ? 'swap.delete-failed-body'
              : 'swap.detail-remove-unpaid',
        ),
        buttons: [
          { text: t('swap.cancel'), style: 'cancel' },
          {
            text: t('swap.delete'),
            style: 'destructive',
            onPress: () => {
              SwapStore.deleteByRecordId(record.recordId).then(() => {
                addLastSnackbar(t('swap.deleted'), SnackbarDurationEnum.short);
                onDone();
              });
            },
          },
        ],
      });
    },
    [translate, addLastSnackbar, onDone],
  );
}
