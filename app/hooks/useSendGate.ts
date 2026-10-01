import { useCallback, useEffect, useRef } from 'react';
import {
  MixnetView,
  sendGateOpen,
} from '@app/walletBackend/transforms/mixnetView';

/**
 * Returns a stable check of the mixnet send gate against the latest view.
 *
 * A confirm dialog or a Confirm screen holds the handler of the render that
 * opened it. The check reads the view through a ref, so a handler from an
 * earlier render still sees the view at confirm time.
 */
export function useSendGate(mixnetView: MixnetView | null): () => boolean {
  const latestView = useRef(mixnetView);
  useEffect(() => {
    latestView.current = mixnetView;
  }, [mixnetView]);
  return useCallback(() => sendGateOpen(latestView.current), []);
}
