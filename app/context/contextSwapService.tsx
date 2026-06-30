import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react';

import { ChainNameEnum } from '../AppState/enums/ChainNameEnum';
import RPCModule from '../RPCModule';
import {
  SwapService,
  SwapStore,
  createSwapService,
  deriveWalletFingerprint,
} from '../swap';
import { SWAPKIT_API_KEY } from '../swap/swapKitSecrets';

/**
 * React context providing access to the singleton `SwapService` for the
 * current loaded wallet.
 *
 * Behaviour:
 *   - Constructs the service lazily on mount when `chainName` is mainnet,
 *     using the API key bundled in `swapKitSecrets.ts`. Tests can override
 *     the key by passing `apiKey` as a prop.
 *   - Provides `null` on testnet or regtest — the swap feature is mainnet-only
 *     because SwapKit has no testnet routing for any of the providers we use.
 *     UI components also gate their entry points on `chainName`, but the
 *     context being `null` is a second layer of defense.
 *   - Owns the polling lifecycle. On mount, kicks off `service.startPolling()`
 *     so any non-terminal records from a previous session resume tracking.
 *     The `SwapPoller` itself auto-stops once there is nothing left to poll;
 *     `SwapService.commitRoute` / `markBroadcasted` re-arm it when new
 *     records are created. On unmount, the poller is explicitly stopped so
 *     no timers leak across logout.
 *
 * The provider stores the service in a `useMemo` keyed by `chainName` so a
 * chain switch (rare but possible) produces a fresh instance bound to the new
 * chain — a defensive precaution; the production app should not change chain
 * within a loaded session.
 */

const SwapServiceContext = createContext<SwapService | null>(null);

export type SwapServiceProviderProps = {
  chainName: ChainNameEnum;
  /** Override the bundled API key. Intended for tests / storybook. */
  apiKey?: string;
  children: ReactNode;
};

export function SwapServiceProvider({
  chainName,
  apiKey,
  children,
}: SwapServiceProviderProps): React.JSX.Element {
  // The service is gated on two async preconditions:
  //   1. The wallet must be loaded so `RPCModule.getUfvkInfo()` returns a
  //      UFVK we can derive a per-wallet fingerprint from. SwapServiceProvider
  //      lives inside LoadedApp so the wallet is already in memory by the
  //      time we mount; the call resolves in milliseconds.
  //   2. `SwapStore.bindToWallet(fp)` must complete so any subsequent
  //      record read/write lands in the namespaced bucket — never in the
  //      legacy global key that pre-namespacing builds wrote to.
  // Until both succeed we publish `null` so callers (the Swap screen and
  // poller-aware consumers) gate themselves the same way they already gate
  // on testnet/regtest. Failures (missing UFVK, bind crash) also resolve to
  // `null`; the swap entry point hides itself and the rest of the app
  // proceeds normally.
  const [service, setService] = useState<SwapService | null>(null);

  useEffect(() => {
    if (chainName !== ChainNameEnum.mainChainName) {
      setService(null);
      return;
    }
    let cancelled = false;
    let created: SwapService | null = null;
    (async () => {
      try {
        const raw = await RPCModule.getUfvkInfo();
        if (cancelled) return;
        if (raw.startsWith('error')) {
          console.log('SwapServiceProvider: getUfvkInfo error:', raw);
          return;
        }
        const parsed = JSON.parse(raw) as { ufvk?: string };
        const ufvk = parsed.ufvk ?? '';
        const fingerprint = deriveWalletFingerprint(ufvk);
        if (!fingerprint) {
          console.log('SwapServiceProvider: empty fingerprint, skipping bind');
          return;
        }
        await SwapStore.bindToWallet(fingerprint);
        if (cancelled) return;
        created = createSwapService({
          apiKey: apiKey ?? SWAPKIT_API_KEY,
          chainName,
        });
        if (cancelled) return;
        setService(created);
        created.startPolling();
      } catch (err) {
        console.log('SwapServiceProvider: init failed:', err);
      }
    })();
    return () => {
      cancelled = true;
      if (created) {
        created.stopPolling();
      }
      setService(null);
    };
  }, [chainName, apiKey]);

  return (
    <SwapServiceContext.Provider value={service}>
      {children}
    </SwapServiceContext.Provider>
  );
}

/**
 * Hook for consumers. Returns `null` on testnet/regtest or while the service
 * is still being constructed; callers should branch on `null` and either hide
 * the swap entry point or render a "not available" placeholder.
 */
export function useSwapService(): SwapService | null {
  return useContext(SwapServiceContext);
}
