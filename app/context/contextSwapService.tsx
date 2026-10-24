import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ChainNameEnum, ValueTransferType } from '@app/AppState';
import { resetPinnedAddress } from '@app/hooks/usePinnedAddress';
import {
  SwapService,
  SwapStore,
  createSwapService,
  readCurrentWalletFingerprint,
  swapRecordToValueTransfer,
} from '@app/swap';
import type { SwapRecordType } from '@app/swap';
import { SWAPKIT_API_KEY } from '@app/swap/swapKitSecrets';

/**
 * Provides the `SwapService` of the open wallet and owns the polling
 * lifecycle: non-terminal records from a previous session resume tracking on
 * mount, and the poller stops on unmount so no timer survives a wallet
 * switch. `SwapPoller` stops itself once nothing is left to poll;
 * `SwapService.commitRoute` and `markBroadcasted` re-arm it.
 *
 * The value is `null` off mainnet, a second gate behind the UI hiding its
 * entry points: SwapKit routes none of our providers on testnet or regtest.
 */
const SwapServiceContext = createContext<SwapService | null>(null);

export type SwapServiceProviderProps = {
  chainName: ChainNameEnum;
  /** Override the bundled API key. Intended for tests. */
  apiKey?: string;
  children: ReactNode;
};

export function SwapServiceProvider({
  chainName,
  apiKey,
  children,
}: SwapServiceProviderProps) {
  // Two concerns, deliberately decoupled. Binding the store to the wallet
  // needs no server and runs on every chain, so History lists past swaps
  // everywhere. Creating the service, which quotes and polls a mainnet-only
  // provider, is gated on the chain.
  const [service, setService] = useState<SwapService | null>(null);

  useEffect(() => {
    let cancelled = false;
    let created: SwapService | null = null;

    (async () => {
      try {
        const fingerprint = await readCurrentWalletFingerprint();
        if (cancelled) {
          return;
        }
        if (!fingerprint) {
          console.error(
            'SwapServiceProvider: the wallet yielded an empty fingerprint',
          );
          return;
        }
        await SwapStore.bindToWallet(fingerprint);
        if (cancelled || chainName !== ChainNameEnum.mainChainName) {
          return;
        }
        created = createSwapService({
          apiKey: apiKey ?? SWAPKIT_API_KEY,
          chainName,
        });
        setService(created);
        created.startPolling();
      } catch (error) {
        console.error(`SwapServiceProvider: init failed ${error}`);
      }
    })();

    return () => {
      cancelled = true;
      if (created) {
        created.stopPolling();
      }
      setService(null);
      // The binding is module state, so left in place it would keep naming
      // the departing wallet's bucket until the next wallet finishes
      // binding, and a History mounted in that window would list another
      // wallet's swaps.
      SwapStore.unbind().catch(error =>
        console.error(`SwapServiceProvider: unbind failed ${error}`),
      );
      // The pinned Receive address is per wallet too.
      resetPinnedAddress();
    };
  }, [chainName, apiKey]);

  return (
    <SwapServiceContext.Provider value={service}>
      {children}
    </SwapServiceContext.Provider>
  );
}

/**
 * `null` off mainnet and while the service is still being built; callers
 * branch on it to hide the swap entry point.
 */
export function useSwapService(): SwapService | null {
  return useContext(SwapServiceContext);
}

/**
 * The swap records of the bound wallet, kept live by the store's own change
 * notifications. Reads the store rather than the service, so History still
 * lists past swaps off mainnet and offline, where the service is `null`.
 */
export function useSwapRecords(): SwapRecordType[] {
  const [records, setRecords] = useState<SwapRecordType[]>([]);

  useEffect(() => {
    let cancelled = false;
    // `subscribe` registers without replaying, and History mounts long after
    // the provider bound the store, so the first read is explicit. A
    // notification that lands while it is in flight is newer and wins.
    const unsubscribe = SwapStore.subscribe(setRecords);
    SwapStore.readAll()
      .then(current => {
        if (!cancelled) {
          setRecords(previous => (previous.length === 0 ? current : previous));
        }
      })
      .catch(error =>
        console.error(`useSwapRecords: initial read failed ${error}`),
      );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return records;
}

/**
 * zingolib's transfers with this wallet's swaps folded in, newest first.
 *
 * Swaps are not deduplicated against the transfer that paid them: the user
 * sees the swap beside the send, so zingolib's transaction stays visible.
 */
export function useValueTransfersWithSwaps(
  valueTransfers: ValueTransferType[],
): ValueTransferType[] {
  const swapRecords = useSwapRecords();

  return useMemo(() => {
    if (swapRecords.length === 0) {
      return valueTransfers;
    }
    return [
      ...valueTransfers,
      ...swapRecords.map(swapRecordToValueTransfer),
    ].sort((a, b) => b.time - a.time);
  }, [valueTransfers, swapRecords]);
}
