import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { SyncStatus } from 'zingo-ffi';
import {
  hasSyncStatus,
  scanInProgress,
} from '@app/walletBackend/utils/syncProgress';

/**
 * Derives display-ready sync state from the raw RPC sync status.
 *
 * Returns the current scan percentage, whether a sync is actively in
 * progress, a `viewSyncStatus` flag that pulses true for 5 s every 29 s so
 * the label briefly appears in the header, and the `Animated.Value` that
 * drives the flame flicker while syncing.
 */

type UseSyncStatusInput = {
  syncingStatus: SyncStatus;
  noSyncingStatus: boolean | undefined;
};

type UseSyncStatusResult = {
  percentageOutputsScanned: number;
  syncInProgress: boolean;
  viewSyncStatus: boolean;
  opacityValue: Animated.Value;
};

export function useSyncStatus({
  syncingStatus,
  noSyncingStatus,
}: UseSyncStatusInput): UseSyncStatusResult {
  const opacityValue = useRef(new Animated.Value(1)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [percentageOutputsScanned, setPercentageOutputsScanned] =
    useState<number>(0);
  const [syncInProgress, setSyncInProgress] = useState<boolean>(true);
  const [viewSyncStatus, setViewSyncStatus] = useState<boolean>(false);

  useEffect(() => {
    if (
      !hasSyncStatus(syncingStatus) ||
      syncingStatus.percentageTotalOutputsScanned === 0
    ) {
      setPercentageOutputsScanned(0);
      setSyncInProgress(true);
    } else {
      setPercentageOutputsScanned(syncingStatus.percentageTotalOutputsScanned);
      setSyncInProgress(scanInProgress(syncingStatus));
    }
  }, [syncingStatus]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const inter = setInterval(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setViewSyncStatus(true);
      timeoutId = setTimeout(() => {
        setViewSyncStatus(false);
      }, 5 * 1000);
    }, 29 * 1000);

    return () => {
      clearInterval(inter);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = Animated.loop(
        Animated.sequence([
          Animated.delay(2000),
          Animated.timing(opacityValue, {
            toValue: 0.15,
            duration: 40,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
        { resetBeforeIteration: true },
      );
    }

    if (!noSyncingStatus) {
      if (syncInProgress) {
        animationRef.current?.start();
      } else {
        animationRef.current?.stop();
        opacityValue.setValue(1);
      }
    } else {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    }

    return () => {
      animationRef.current?.stop();
      opacityValue.setValue(1);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncInProgress, noSyncingStatus]);

  return {
    percentageOutputsScanned,
    syncInProgress,
    viewSyncStatus,
    opacityValue,
  };
}
