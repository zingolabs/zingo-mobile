import { useEffect, useReducer } from 'react';
import { AppState, NativeEventSubscription } from 'react-native';
import { getZecPrice } from '../../app/walletBackend';
import { MixnetStatusKey } from '../../app/walletBackend/transforms/mixnetPresenter';

/**
 * Shared, singleton state for the price surface's fetch lifecycle.
 *
 * ADR 0008: the price surface has no manual fetch, and the Nym opt-in is
 * the single and only consent for price traffic. The PriceTrafficDriver
 * mounted by LoadedApp attaches here for the wallet session and carries
 * the consent bit in its deps, so the displayed currency never decides
 * what may be fetched; PriceFetcher and usePriceFetcherStore only
 * observe. The store owns the whole lifecycle:
 *   - ONE auto-refresh timer while the driver is attached, the gate-open
 *     foreground holds, and the transport is not a refusing verdict
 *     ('off' or 'died'): each fetch schedules the next at a uniform
 *     random delay of five to ten minutes. A background transition
 *     pauses the cadence, and iOS 'inactive' (Control Center, the app's
 *     own Face ID sheet) is a non-event.
 *   - A fetch at every entry: attach (boot), the Nym consent turning
 *     on, and LoadedApp's foreground gate opening after a real
 *     background return (never on the raw AppState event, which races a
 *     locked, unauthenticated wallet). Entry fetches inside the burst
 *     cooldown of the last start or last success yield to the cadence.
 *   - The ready follow-up: an unattended fetch refused during bootstrap
 *     arms a one-shot fetch that fires when the Indicator turns ready.
 *     It is dropped on a background transition and on a 'died' or 'off'
 *     verdict, survives an in-flight fetch, and a transient 'unknown'
 *     status poll never drops it.
 *   - No snackbars. A failure leaves the last price standing; the stale
 *     cue (see usePriceStale) is the only failure signal.
 */

// ADR 0008 cadence: each fetch schedules the next at a uniform draw
// from this window.
export const PRICE_REFRESH_MIN_MS = 5 * 60_000;
export const PRICE_REFRESH_MAX_MS = 10 * 60_000;
// A price older than this wall-clock age is stale (CONTEXT.md: Stale price).
export const PRICE_STALE_MS = 5 * 60_000;
// The JS-side bound on one native price call: a wedged FFI promise must
// never pin `loading` for the process lifetime.
const PRICE_FETCH_TIMEOUT_MS = 30_000;
// Rapid remounts and app hops must not multiply fetches.
const FETCH_BURST_COOLDOWN_MS = 5_000;
// A wedged native call is reused until this age, then retired so a fresh
// request can run: bounded orphans, never a corpse cached forever.
const NATIVE_CALL_TTL_MS = 5 * 60_000;

type Deps = {
  setZecPrice: (price: number, date: number) => void;
  // The live Indicator key; 'mixnet.status.unknown' before a publication.
  mixnetStatusKey: MixnetStatusKey;
  // The date of the price the context currently holds.
  priceDate: number;
  // The persisted Nym opt-in: the sole consent for price traffic. The
  // display currency chooses what to show, never what may be fetched.
  nymSelected: boolean;
  // Whether a market exists to ask: a live server selection on mainnet.
  // Offline mode and other chains have no usable ZEC/USD price.
  marketAvailable: boolean;
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
let lastSuccessAt = 0;
let lastReturnFetchAt = 0;
let nativeCallStartedAt = 0;
// Bumped at every fetch completion, success or failure.
let cycle = 0;
// The armed tick's deadline and the delay it was drawn with, so the
// ring can render the cadence that is actually running; 0 until the
// first schedule.
let nextFetchAt = 0;
let nextFetchDelayMs = 0;
// The single in-flight native call: a wedged one is raced against the
// bound and reused by later attempts, never multiplied into a pile of
// orphaned FFI calls each pinning a native thread.
let nativeCall: Promise<{ price: number; error: string }> | null = null;
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

// 'off' and 'died' are transport verdicts under which the wallet refuses
// every price fetch by the route rule, so attempting is pure waste.
function transportRefuses(): boolean {
  return (
    deps?.mixnetStatusKey === 'mixnet.status.off' ||
    deps?.mixnetStatusKey === 'mixnet.status.died'
  );
}

// The one gate every path consults: the consent, the market, an attached
// session, the foreground, and a transport that could serve. Hand-copied
// guard subsets drifted; this predicate is the single source.
function surfaceMayFetch(): boolean {
  return (
    deps !== null &&
    deps.nymSelected &&
    deps.marketAvailable &&
    attachCount > 0 &&
    !appAway &&
    !transportRefuses()
  );
}

function scheduleAuto(): void {
  clearAuto();
  if (!surfaceMayFetch()) return;
  nextFetchDelayMs =
    PRICE_REFRESH_MIN_MS +
    Math.random() * (PRICE_REFRESH_MAX_MS - PRICE_REFRESH_MIN_MS);
  nextFetchAt = Date.now() + nextFetchDelayMs;
  autoTimer = setTimeout(() => {
    // Null the handle first: a tick that fires into a state doFetch
    // refuses must not leave a dead handle blocking every reschedule.
    autoTimer = null;
    doFetch('timer').catch(() => {});
  }, nextFetchDelayMs);
  emit();
}

function startNativeCall(): Promise<{ price: number; error: string }> {
  if (nativeCall && Date.now() - nativeCallStartedAt > NATIVE_CALL_TTL_MS) {
    // The cached call wedged past its TTL: retire the corpse so a fresh
    // request can run instead of reattaching to it forever.
    nativeCall = null;
  }
  if (!nativeCall) {
    nativeCallStartedAt = Date.now();
    const launched: Promise<{ price: number; error: string }> =
      getZecPrice().finally(() => {
        if (nativeCall === launched) {
          nativeCall = null;
        }
      });
    nativeCall = launched;
  }
  return nativeCall;
}

// One price attempt under the JS-side bound; a wedged native call reads
// as a refused attempt instead of holding the surface forever.
async function boundedPrice(): Promise<number> {
  let bound: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<{ price: number }>(resolve => {
    bound = setTimeout(() => resolve({ price: -3 }), PRICE_FETCH_TIMEOUT_MS);
  });
  try {
    const { price } = await Promise.race([startNativeCall(), expiry]);
    return price;
  } finally {
    clearTimeout(bound);
  }
}

async function doFetch(kind: FetchKind): Promise<void> {
  if (loading || !surfaceMayFetch() || !deps) {
    return;
  }
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
    if (price <= 0 && surfaceMayFetch()) {
      // The consent re-check: no second attempt for a surface every
      // fetcher has left, for a backgrounded app, or after the Nym
      // opt-in was withdrawn mid-flight.
      price = await boundedPrice();
    }

    if (price > 0) {
      if (surfaceMayFetch()) {
        followUpArmed = false;
        entryPending = false; // a fresh price satisfies a pending return
        lastSuccessAt = Date.now();
        d.setZecPrice(price, lastSuccessAt);
      }
    } else if (
      kind !== 'readyFollowUp' &&
      surfaceMayFetch() &&
      (launchStatusKey === 'mixnet.status.bootstrapping' ||
        deps?.mixnetStatusKey === 'mixnet.status.bootstrapping')
    ) {
      // Refused during bootstrap, judged by the launch status or the
      // live one: the ready follow-up recovers the price seconds after
      // the transport comes up instead of a full tick later. The
      // consent re-check keeps a flight that outlived a background
      // transition from re-arming what that transition dropped, and the
      // follow-up itself never re-arms. Every other failure is silent;
      // the last price stands and the stale cue carries the signal.
      followUpArmed = true;
    }
  } finally {
    loading = false;
    cycle++;
    scheduleAuto();
    emit();
    if (entryPending && surfaceMayFetch() && deps) {
      // The return that landed inside this flight gets its fetch and
      // stamps the hop rate bound, exactly as an unparked return does.
      entryPending = false;
      lastReturnFetchAt = Date.now();
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
  } else if (transportRefuses()) {
    // A real transport verdict ends the bootstrap the arm belonged to.
    // 'unknown' is one failed status poll, not a verdict, and a
    // bootstrap's polls are flakiest exactly while the arm matters, so
    // both it and 'bootstrapping' keep the arm standing.
    followUpArmed = false;
  }
}

// The seam attach and setDeps share: every entry (boot, the consent
// turning on, a recovered surface) fetches at once. A running timer or
// flight means the cadence already owns the surface, and a start inside
// the burst cooldown (a remount storm) yields to it too.
function entryOrSchedule(): void {
  if (!surfaceMayFetch() || loading || autoTimer) {
    return;
  }
  if (Date.now() - lastFetchStartAt < FETCH_BURST_COOLDOWN_MS) {
    scheduleAuto();
  } else {
    doFetch('entry').catch(() => {});
  }
}

function onAppStateChange(next: string): void {
  if (next === 'background') {
    appAway = true;
    followUpArmed = false;
    entryPending = false;
    clearAuto();
  }
  // 'active' proves nothing about the wallet's lock state, so only the
  // open foreground gate (foregroundReturned) ends the pause: a locked
  // wallet's re-renders must find the surface still away. 'inactive'
  // and 'unknown' prove nothing and change nothing.
}

export const priceFetcherStore = {
  /** Keep the latest context-bound callbacks (same across all instances). */
  setDeps(d: Deps): void {
    deps = d;
    if (!d.nymSelected) {
      // The consent was withdrawn (or never given): stop the cadence.
      clearAuto();
      followUpArmed = false;
      entryPending = false;
      return;
    }
    pump();
    entryOrSchedule();
  },
  /** Register the wallet session's price surface, returning the detach cleanup. */
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
  /**
   * The every-real-return-fetches trigger, called by LoadedApp once its
   * foreground gate has opened, and the only place the background pause
   * ends. A return inside a flight parks the fetch for the flight's
   * landing; a return within the burst cooldown of a SUCCESS rides the
   * price that fetch just brought; and hops during a failure window are
   * rate-bound by the last return-triggered fetch, so one recent
   * failure never excuses a return while a storm of hops cannot
   * multiply into one fetch each.
   */
  foregroundReturned(): void {
    appAway = false;
    if (!surfaceMayFetch()) return;
    if (loading) {
      entryPending = true;
    } else if (
      Date.now() - lastSuccessAt < FETCH_BURST_COOLDOWN_MS ||
      Date.now() - lastReturnFetchAt < FETCH_BURST_COOLDOWN_MS
    ) {
      if (!autoTimer) {
        scheduleAuto();
      }
    } else {
      lastReturnFetchAt = Date.now();
      doFetch('entry').catch(() => {});
    }
  },
  snapshot(): {
    loading: boolean;
    cycle: number;
    nextFetchAt: number;
    nextFetchDelayMs: number;
  } {
    return { loading, cycle, nextFetchAt, nextFetchDelayMs };
  },
  /** Test-only: forget the burst clocks, the arm state, and any wedged in-flight native call. */
  resetForTests(): void {
    lastFetchStartAt = 0;
    lastSuccessAt = 0;
    lastReturnFetchAt = 0;
    nativeCallStartedAt = 0;
    nextFetchAt = 0;
    nextFetchDelayMs = 0;
    followUpArmed = false;
    entryPending = false;
    nativeCall = null;
    loading = false;
    clearAuto();
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
