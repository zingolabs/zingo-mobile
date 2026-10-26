import { useContext, useEffect, useRef } from 'react';
import { Route, SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { navigationRef } from '@app/navigation/navigate';
import { SwapStatusEnum, SwapStore, newlyExpired } from '@app/swap';
import type { SwapRecordType } from '@app/swap';

/** Whether the swap's own deposit, tracking or detail is the screen in front. */
function onScreen(recordId: string): boolean {
  if (!navigationRef.isReady()) return false;
  const current = navigationRef.getCurrentRoute();
  const swapScreens: string[] = [
    Route.SwapDeposit,
    Route.SwapTracking,
    Route.SwapDetail,
  ];
  return (
    !!current &&
    swapScreens.includes(current.name) &&
    (current.params as { recordId?: string } | undefined)?.recordId === recordId
  );
}

/**
 * Says when a swap's deposit ran out of time while the user was elsewhere:
 * "Your BTC quote expired. Nothing was sent." The swap's own screens say it
 * themselves, so a swap in front gets no toast.
 */
export default function SwapExpiryNotice() {
  const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
  const seen = useRef<Map<string, SwapStatusEnum> | null>(null);

  useEffect(() => {
    const statuses = (records: ReadonlyArray<SwapRecordType>) =>
      new Map(records.map(record => [record.recordId, record.status]));
    const unsubscribe = SwapStore.subscribe(records => {
      const before = seen.current;
      seen.current = statuses(records);
      if (!before) {
        return;
      }
      for (const record of newlyExpired(before, records)) {
        if (onScreen(record.recordId)) {
          continue;
        }
        addLastSnackbar(
          (translate('swap.expired-toast') as string).replace(
            '{coin}',
            record.sellAsset.ticker ?? record.sellAsset.symbol,
          ),
          SnackbarDurationEnum.long,
        );
      }
    });
    SwapStore.readAll()
      .then(records => {
        if (!seen.current) {
          seen.current = statuses(records);
        }
      })
      .catch(error =>
        console.log(`SwapExpiryNotice: initial read failed ${error}`),
      );
    return unsubscribe;
  }, [translate, addLastSnackbar]);

  return null;
}
