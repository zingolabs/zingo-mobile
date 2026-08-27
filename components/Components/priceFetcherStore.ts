import { useEffect, useReducer } from 'react';
import { AppState, NativeEventSubscription } from 'react-native';
import { getZecPrice } from '../../app/walletBackend';
import { MixnetStatusKey } from '../../app/walletBackend/transforms/mixnetPresenter';

/**
 * Shared, singleton state for every <PriceFetcher/> on screen.
 *
 * ADR 0008: the price surface has no manual fetch. A mounted PriceFetcher
 * (the render sites gate on USD, the consent) attaches here; observation
 * through usePriceFetcherStore carries no consent and never starts
 * traffic. The store owns the whole lifecycle:
 *   - ONE auto-refresh timer while at least one fetcher is attached and
 *     the app is in the foreground; a background transition pauses it.
 *     iOS 'inactive' (Control Center, the app's own Face ID sheet) is a
 *     non-event, matching LoadedApp's reading of the same signal.
 *   - A fetch on every background -> active return, and on attach when
 *     the context holds no fresh price.
 *   - The ready follow-up: a foreground-entry fetch refused while the
 *     mixnet Indicator is bootstrapping arms a one-shot fetch that fires
 *     when the Indicator turns ready. It is dropped on a background
 *     transition and on any transport state other than bootstrapping,
 *     and it survives an in-flight fetch instead of being consumed by it.
 *   - No snackbars. A failure leaves the last price standing; the stale
 *     cue (see usePriceStale) is the only failure signal.
 */

export const PRICE_AUTO_REFRESH_MS = 60_000;
// A price older than this wall-clock age is stale (CONTEXT.md: Stale price).
export const PRICE_STALE_MS = 5 * 60_000;

type Deps = {
  setZecPrice: (price: number, date: number) => void;
  // The live Indicator key; 'mixnet.status.unknown' before a publication.
  mixnetStatusKey: MixnetStatusKey;
  // The date of the price the context currently holds.
  priceDate: number;
};

// Only a foreground-entry refusal may arm the ready follow-up.
type FetchKind = 'entry' | 'timer' | 'readyFollowUp';

let loading = false;
let followUpArmed = false;
let deps: Deps | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
let attachCount = 0;
let appStateSub: NativeEventSubscription | null = null;
let appAway = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

function clearAuto(): void {
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
}

function scheduleAuto(): void {
  clearAuto();
  if (attachCount === 0 || appAway) return;
  autoTimer = setTimeout(() => {
    doFetch('timer').catch(() => {});
  }, PRICE_AUTO_REFRESH_MS);
}

async function doFetch(kind: FetchKind): Promise<void> {
  if (loading || !deps || attachCount === 0 || appAway) return;
  const d = deps;

  loading = true;
  emit();
  try {
    let price: number;
    // first attempt
    ({ price } = await getZecPrice());
    // 0 initial · -1 Gemini/zingolib · -2 RPCModule · >0 real value
    if (price <= 0) {
      // second attempt
      ({ price } = await getZecPrice());
    }

    if (price > 0) {
      followUpArmed = false;
      d.setZecPrice(price, Date.now());
    } else if (
      kind === 'entry' &&
      !appAway &&
      deps?.mixnetStatusKey === 'mixnet.status.bootstrapping'
    ) {
      // Refused during bootstrap: the ready follow-up recovers the price
      // seconds after the transport comes up instead of a full tick
      // later. The appAway re-check keeps a flight that outlived a
      // background transition from re-arming what that transition
      // dropped. Every other failure is silent; the last price stands
      // and the stale cue carries the signal.
      followUpArmed = true;
    }
  } finally {
    loading = false;
    emit();
    scheduleAuto();
    pump(); // a follow-up that turned ready mid-flight fires now
  }
}

// Fires the armed ready follow-up, consuming it exactly when its fetch
// actually starts, and disarms it when the transport story it belonged
// to has ended.
function pump(): void {
  if (!followUpArmed || loading || !deps || attachCount === 0 || appAway) {
    return;
  }
  if (deps.mixnetStatusKey === 'mixnet.status.ready') {
    followUpArmed = false;
    doFetch('readyFollowUp').catch(() => {});
  } else if (deps.mixnetStatusKey !== 'mixnet.status.bootstrapping') {
    // died, off, unknown: the arm belonged to a bootstrap that is over.
    followUpArmed = false;
  }
}

// Fetch when the context holds no fresh price, otherwise start the
// cadence: the seam attach, setDeps, and a quiet return all share. A
// running timer or flight means the cadence already owns the surface, so
// a refused fetch cannot echo into a refetch storm through the
// re-renders its own emit causes.
function entryOrSchedule(): void {
  if (!deps || attachCount === 0 || appAway || loading || autoTimer) return;
  if (Date.now() - deps.priceDate > PRICE_AUTO_REFRESH_MS) {
    doFetch('entry').catch(() => {});
  } else {
    scheduleAuto();
  }
}

function onAppStateChange(next: string): void {
  if (next === 'background') {
    appAway = true;
    followUpArmed = false;
    clearAuto();
  } else if (next === 'active') {
    const returning = appAway;
    appAway = false;
    if (returning) {
      // Every real return fetches (the grilled decision); 'inactive'
      // round trips never set appAway, so they cannot reach this.
      doFetch('entry').catch(() => {});
    } else if (!autoTimer && !loading) {
      scheduleAuto();
    }
  }
  // 'inactive' and 'unknown' prove nothing and change nothing.
}

export const priceFetcherStore = {
  /** Keep the latest context-bound callbacks (same across all instances). */
  setDeps(d: Deps): void {
    deps = d;
    pump();
    entryOrSchedule();
  },
  /** Register a mounted price surface, the consent that lets fetches run, returning the detach cleanup. */
  attach(): () => void {
    attachCount++;
    if (attachCount === 1) {
      appAway = AppState.currentState === 'background';
      appStateSub = AppState.addEventListener('change', onAppStateChange);
      entryOrSchedule();
    }
    return () => {
      attachCount--;
      if (attachCount === 0) {
        clearAuto();
        appStateSub?.remove();
        appStateSub = null;
        followUpArmed = false;
        deps = null;
      }
    };
  },
  snapshot(): { loading: boolean } {
    return { loading };
  },
  /** Observe store state; observation carries no consent and starts no traffic. */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** Subscribe a component to the shared store; returns the current snapshot. */
export function usePriceFetcherStore(): ReturnType<
  typeof priceFetcherStore.snapshot
> {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => priceFetcherStore.subscribe(force), []);
  return priceFetcherStore.snapshot();
}

/** Whether the price at `priceDate` is stale, re-rendering the caller at the wall-clock crossing. */
export function usePriceStale(priceDate: number): boolean {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!priceDate) return;
    const untilStale = priceDate + PRICE_STALE_MS - Date.now();
    if (untilStale <= 0) return;
    const crossing = setTimeout(force, untilStale + 50);
    return () => clearTimeout(crossing);
  }, [priceDate]);
  return priceDate > 0 && Date.now() - priceDate > PRICE_STALE_MS;
}
