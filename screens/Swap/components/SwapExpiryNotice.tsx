import { useContext, useEffect, useRef } from 'react';
import { Route, SnackbarDurationEnum } from '@app/AppState';
import { ContextAppLoaded } from '@app/context';
import { navigationRef } from '@app/navigation/navigate';
import {
  SwapStatusEnum,
  SwapStore,
  newlyExpired,
  newlyRefunding,
} from '@app/swap';
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
 * Says what happened to a purchase while the user was elsewhere: its deposit
 * ran out of time ("Your BTC quote expired. Nothing was sent."), or a payment
 * came after that and is going back. The swap's own screens say it
 * themselves, so a swap in front gets no toast.
 */
export default function SwapExpiryNotice() {
  const { translate, addLastSnackbar } = useContext(ContextAppLoaded);
  const seen = useRef<Map<string, SwapStatusEnum> | null>(null);

  useEffect(() => {
    const statuses = (records: ReadonlyArray<SwapRecordType>) =>
      new Map(records.map(record => [record.recordId, record.status]));
    const coin = (record: SwapRecordType) =>
      record.sellAsset.ticker ?? record.sellAsset.symbol;
    const say = (key: string, record: SwapRecordType) => {
      if (onScreen(record.recordId)) {
        return;
      }
      addLastSnackbar(
        (translate(key) as string).replace('{coin}', coin(record)),
        SnackbarDurationEnum.long,
      );
    };
    const unsubscribe = SwapStore.subscribe(records => {
      const before = seen.current;
      seen.current = statuses(records);
      if (!before) {
        return;
      }
      newlyExpired(before, records).forEach(record =>
        say('swap.expired-toast', record),
      );
      newlyRefunding(before, records).forEach(record =>
        say('swap.late-toast', record),
      );
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
