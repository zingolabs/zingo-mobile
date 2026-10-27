import { useCallback, useContext } from 'react';
import { SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { SwapStore, isPrePaymentStatus } from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { showConfirm } from '@app/services/showConfirm';
import { swapOutcome } from './swapProgress';

/**
 * Deletes a swap after the user confirms, with the warning its state calls
 * for: an expired one moved no funds, an unpaid one may still be paid by
 * hand, any other leaves its transactions on chain. `onDone` runs once it
 * is gone.
 */
export function useRemoveSwap(onDone: () => void) {
  const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
  return useCallback(
    (record: SwapRecordType) => {
      const t = (key: string) => (translate(key) as string).trim();
      const expired = swapOutcome(record.status) === 'expired';
      showConfirm({
        title: t(
          expired ? 'swap.delete-expired-title' : 'swap.detail-remove-title',
        ),
        message: t(
          expired
            ? 'swap.delete-expired-body'
            : isPrePaymentStatus(record.status)
              ? 'swap.detail-remove-unpaid'
              : 'swap.detail-remove-body',
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
