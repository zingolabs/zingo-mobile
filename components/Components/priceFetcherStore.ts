import { useEffect, useReducer } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getZecPrice } from '../../app/walletBackend';

/**
 * Shared, singleton state for every <PriceFetcher/> on screen.
 *
 * ADR 0008: the price surface has no manual fetch. Mounting a fetcher with
 * USD selected (the render sites gate on the currency) is the consent for
 * price traffic; every fetch is app-initiated and silent. The store owns
 * the whole lifecycle:
 *   - ONE auto-refresh timer while at least one fetcher is mounted and the
 *     app is in the foreground; backgrounding pauses it.
 *   - A fetch on every return to the foreground, and on the first mount
 *     when no fresh price exists.
 *   - The ready follow-up: a foreground-entry fetch refused while the
 *     mixnet Indicator is bootstrapping arms a one-shot fetch that fires
 *     when the Indicator turns ready. It is dropped on `died` and on the
 *     next background transition.
 *   - No snackbars. A failure leaves the last price standing; the stale
 *     cue (see usePriceStale) is the only failure signal.
 */

export const PRICE_AUTO_REFRESH_MS = 60_000;
// A price older than this wall-clock age is stale (CONTEXT.md: Stale price).
export const PRICE_STALE_MS = 5 * 60_000;

const MIXNET_BOOTSTRAPPING = 'mixnet.status.bootstrapping';
const MIXNET_READY = 'mixnet.status.ready';
const MIXNET_DIED = 'mixnet.status.died';

type Deps = {
  setZecPrice: (price: number, date: number) => void;
  // The current MixnetView statusKey, null before the first publication.
  mixnetStatusKey: string | null;
};

// Only a foreground-entry refusal may arm the ready follow-up.
type FetchKind = 'entry' | 'timer' | 'readyFollowUp';

let loading = false;
let lastSuccessAt = 0;
let followUpArmed = false;
let deps: Deps | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
let appStateWired = false;
let appActive = true;
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
  if (listeners.size === 0 || !appActive) return;
  autoTimer = setTimeout(() => {
    doFetch('timer').catch(() => {});
  }, PRICE_AUTO_REFRESH_MS);
}

async function doFetch(kind: FetchKind): Promise<void> {
  if (loading || !deps) return;
  const d = deps;

  loading = true;
  emit();

  let price: number;
  // first attempt
  ({ price } = await getZecPrice());
  // 0 initial · -1 Gemini/zingolib · -2 RPCModule · >0 real value
  if (price <= 0) {
    // second attempt
    ({ price } = await getZecPrice());
  }

  if (price > 0) {
    lastSuccessAt = Date.now();
    followUpArmed = false;
    d.setZecPrice(price, lastSuccessAt);
  } else if (
    kind === 'entry' &&
    deps?.mixnetStatusKey === MIXNET_BOOTSTRAPPING
  ) {
    // Refused during bootstrap: the ready follow-up recovers the price
    // seconds after the transport comes up instead of a full tick later.
    followUpArmed = true;
  }
  // Every other failure is silent; the last price stands and the stale
  // cue carries the signal.

  loading = false;
  emit();
  scheduleAuto();
}

function onAppStateChange(next: AppStateStatus): void {
  const wasActive = appActive;
  // 'unknown' proves nothing and must neither pause nor fetch.
  if (next === 'active') {
    appActive = true;
    if (!wasActive && listeners.size > 0) {
      doFetch('entry').catch(() => {});
    }
  } else if (next === 'background' || next === 'inactive') {
    appActive = false;
    followUpArmed = false;
    clearAuto();
  }
}

function wireAppState(): void {
  if (appStateWired) return;
  appStateWired = true;
  appActive = AppState.currentState !== 'background' &&
    AppState.currentState !== 'inactive';
  AppState.addEventListener('change', onAppStateChange);
}

export const priceFetcherStore = {
  /** Keep the latest context-bound callbacks (same across all instances). */
  setDeps(d: Deps): void {
    deps = d;
    if (followUpArmed) {
      if (d.mixnetStatusKey === MIXNET_DIED) {
        followUpArmed = false;
      } else if (d.mixnetStatusKey === MIXNET_READY) {
        followUpArmed = false;
        doFetch('readyFollowUp').catch(() => {});
      }
    }
  },
  snapshot(): { loading: boolean } {
    return { loading };
  },
  subscribe(listener: () => void): () => void {
    wireAppState();
    const first = listeners.size === 0;
    listeners.add(listener);
    if (first && appActive) {
      if (Date.now() - lastSuccessAt > PRICE_AUTO_REFRESH_MS) {
        doFetch('entry').catch(() => {});
      } else {
        scheduleAuto();
      }
    }
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) clearAuto();
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
