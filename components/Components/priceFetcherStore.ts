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
// The JS-side bound on one native price call: a wedged FFI promise must
// never pin `loading` for the process lifetime.
const PRICE_FETCH_TIMEOUT_MS = 30_000;
// Rapid app hops must not multiply fetches: a return re-fetches only when
// the last fetch started at least this long ago.
const RETURN_FETCH_COOLDOWN_MS = 5_000;

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
// A return that landed while a fetch was in flight; honored when the
// flight lands so a real return always produces its fetch.
let entryPending = false;
let deps: Deps | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
let attachCount = 0;
let appStateSub: NativeEventSubscription | null = null;
let appAway = false;
let lastFetchStartAt = 0;
// Bumped at every fetch completion, success or failure, so the ring can
// restart its fill for the cycle that actually begins.
let cycle = 0;
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

// One price attempt under the JS-side bound; a wedged native call reads
// as a refused attempt instead of holding the surface forever.
async function boundedPrice(): Promise<number> {
  let bound: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<{ price: number }>(resolve => {
    bound = setTimeout(
      () => resolve({ price: -3 }),
      PRICE_FETCH_TIMEOUT_MS,
    );
  });
  try {
    const { price } = await Promise.race([getZecPrice(), expiry]);
    return price;
  } finally {
    clearTimeout(bound);
  }
}

async function doFetch(kind: FetchKind): Promise<void> {
  if (loading || !deps || attachCount === 0 || appAway) return;
  const d = deps;
  // The status the flight launched under: a refusal belongs to this
  // transport story even when the Indicator moves mid-flight.
  const launchStatusKey = d.mixnetStatusKey;

  loading = true;
  lastFetchStartAt = Date.now();
  emit();
  try {
    // first attempt
    // 0 initial · -1 Gemini/zingolib · -2 RPCModule · -3 bound · >0 real
    let price = await boundedPrice();
    if (price <= 0 && attachCount > 0 && !appAway) {
      // The consent re-check: no second attempt for a surface every
      // fetcher has left, or for a backgrounded app.
      price = await boundedPrice();
    }

    if (price > 0) {
      if (attachCount > 0) {
        followUpArmed = false;
        entryPending = false; // a fresh price satisfies a pending return
        d.setZecPrice(price, Date.now());
      }
    } else if (
      kind !== 'readyFollowUp' &&
      !appAway &&
      attachCount > 0 &&
      (launchStatusKey === 'mixnet.status.bootstrapping' ||
        deps?.mixnetStatusKey === 'mixnet.status.bootstrapping')
    ) {
      // Refused during bootstrap, judged by the launch status or the
      // live one: the ready follow-up recovers the price seconds after
      // the transport comes up instead of a full tick later. The appAway
      // re-check keeps a flight that outlived a background transition
      // from re-arming what that transition dropped, and the follow-up
      // itself never re-arms. Every other failure is silent; the last
      // price stands and the stale cue carries the signal.
      followUpArmed = true;
    }
  } finally {
    loading = false;
    cycle++;
    emit();
    scheduleAuto();
    if (entryPending && attachCount > 0 && !appAway && deps) {
      // The return that landed inside this flight gets its fetch.
      entryPending = false;
      doFetch('entry').catch(() => {});
    }
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
  } else if (
    deps.mixnetStatusKey === 'mixnet.status.died' ||
    deps.mixnetStatusKey === 'mixnet.status.off'
  ) {
    // A real transport verdict ends the bootstrap the arm belonged to.
    // 'unknown' is one failed status poll, not a verdict, and a
    // bootstrap's polls are flakiest exactly while the arm matters, so
    // both it and 'bootstrapping' keep the arm standing.
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
    entryPending = false;
    clearAuto();
  } else if (next === 'active') {
    const returning = appAway;
    appAway = false;
    if (!returning) {
      if (!autoTimer && !loading) {
        scheduleAuto();
      }
      return;
    }
    // Every real return fetches (the grilled decision); 'inactive' round
    // trips never set appAway, so they cannot reach this. A return
    // landing inside a flight parks its fetch for the flight's landing,
    // and hops inside the cooldown ride the price the last fetch just
    // brought.
    if (loading) {
      entryPending = true;
    } else if (Date.now() - lastFetchStartAt < RETURN_FETCH_COOLDOWN_MS) {
      if (!autoTimer) {
        scheduleAuto();
      }
    } else {
      doFetch('entry').catch(() => {});
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
        entryPending = false;
        deps = null;
      }
    };
  },
  snapshot(): { loading: boolean; cycle: number } {
    return { loading, cycle };
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
