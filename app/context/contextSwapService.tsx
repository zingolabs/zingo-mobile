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
  // Two concerns are deliberately decoupled here:
  //
  //   A. Binding the SwapStore to the wallet. Swap history is LOCAL data
  //      (records keyed by the UFVK-derived fingerprint), so it must be
  //      readable in every mode — Offline included, and on any chain. This
  //      only needs `RPCModule.getUfvkInfo()` (available without a server)
  //      and always runs. Without it the store stays unbound and the History
  //      screen shows no swap rows, which previously only happened to work
  //      Offline if an online session had bound the store earlier (the bind
  //      is sticky at module scope) — a flaky, session-order-dependent bug.
  //
  //   B. Creating the SwapService (quotes + polling). This talks to a
  //      mainnet-only provider and needs connectivity, so it is gated on
  //      `chainName === mainnet`. On any other chain (or Offline, where the
  //      chain normalizes away) the service stays `null` and the swap entry
  //      point hides itself — the History rows still render from the bound
  //      store.
  //
  // The service `null` is published until B succeeds; missing UFVK / bind
  // failure also resolve to `null` and the app proceeds normally.
  const [service, setService] = useState<SwapService | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: SwapService | null = null;
    (async () => {
      try {
        // (A) Bind the store to the wallet unconditionally — regardless of
        // chain or connectivity — so swap history is available in every mode,
        // Offline included. The fingerprint comes from the loaded wallet's
        // UFVK, which needs no server.
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

        // (B) The SwapService (quotes + polling) is mainnet-only and needs
        // connectivity. On any other chain — or Offline, where the chain
        // normalizes away — leave the service null; the store stays bound so
        // History still renders its rows.
        if (chainName !== ChainNameEnum.mainChainName) {
          setService(null);
          return;
        }
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
