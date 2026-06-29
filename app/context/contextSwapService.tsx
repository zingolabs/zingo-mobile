import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { ChainNameEnum } from '../AppState/enums/ChainNameEnum';
import { SwapService, createSwapService } from '../swap';
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
  const service = useMemo<SwapService | null>(() => {
    if (chainName !== ChainNameEnum.mainChainName) return null;
    try {
      return createSwapService({
        apiKey: apiKey ?? SWAPKIT_API_KEY,
        chainName,
      });
    } catch (err) {
      console.log('SwapServiceProvider: createSwapService failed:', err);
      return null;
    }
  }, [chainName, apiKey]);

  useEffect(() => {
    if (!service) return;
    service.startPolling();
    return () => {
      service.stopPolling();
    };
  }, [service]);

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
