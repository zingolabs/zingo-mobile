import { useEffect, useReducer, useSyncExternalStore } from 'react';
import { AppState, NativeEventSubscription } from 'react-native';
import { getZecPrice } from '../../app/walletBackend';
import {
  MixnetStatusKey,
  transportDisposition,
} from '../../app/walletBackend/transforms/mixnetPresenter';

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
// The JS-side bound on one native price call: a wedged FFI promise must
// never pin `loading` for the process lifetime.
const PRICE_FETCH_TIMEOUT_MS = 30_000;
// A price older than this wall-clock age is stale (CONTEXT.md: Stale
// price): the cadence ceiling plus one fetch bound of headroom, so a
// healthy cadence never dims, not even on a ceiling draw's latency.
export const PRICE_STALE_MS = PRICE_REFRESH_MAX_MS + PRICE_FETCH_TIMEOUT_MS;
// Rapid remounts and app hops must not multiply fetches.
const FETCH_BURST_COOLDOWN_MS = 5_000;
// A wedged native call is reused until this age, then retired so a fresh
// request can run: bounded orphans, never a corpse cached forever.
const NATIVE_CALL_TTL_MS = 5 * 60_000;

type Deps = {
  setZecPrice: (price: number, date: number) => void;
  // The live Indicator key; 'mixnet.status.unknown' before a publication.
  mixnetStatusKey: MixnetStatusKey;
  // The persisted Nym opt-in: the sole consent for price traffic. The
  // display currency chooses what to show, never what may be fetched.
  nymSelected: boolean;
  // Whether a market exists to ask: a live server selection on mainnet.
  // Offline mode and other chains have no usable ZEC/USD price.
  marketAvailable: boolean;
};

// What every observer reads: identity-stable between real changes, as
// useSyncExternalStore requires.
type PriceSurfaceSnapshot = {
  loading: boolean;
  nextFetchAt: number;
  nextFetchDelayMs: number;
  // The store's own render verdict, so no view re-derives (and drifts
  // from) surfaceMayFetch.
  surfaceActive: boolean;
};

// The auto-refresh cadence as a discriminated union, so a deadline can
// never outlive its timer by accident: 'armed' carries both, 'due'
// names the window between the tick firing and its flight landing.
type Cadence =
  | { state: 'idle' }
  | {
      state: 'armed';
      timer: ReturnType<typeof setTimeout>;
      deadline: number;
      delayMs: number;
    }
  | { state: 'due'; deadline: number; delayMs: number };

// The single native price call: a wedged one is raced against the bound
// and reused by later attempts, never multiplied into a pile of
// orphaned FFI calls each pinning a native thread.
type NativeFlight =
  | { state: 'none' }
  | {
      state: 'inFlight';
      call: Promise<{ price: number; error: string }>;
      startedAt: number;
    };

let loading = false;
let followUpArmed = false;
// A return that landed while a fetch was in flight; honored when the
// flight lands so a real return always produces its fetch.
let entryPending = false;
let deps: Deps | undefined;
let cadence: Cadence = { state: 'idle' };
let attachCount = 0;
// Bumped when a session detaches: a flight that outlived its session
// must not write state or spawn work into the next one.
let sessionEpoch = 0;
let appStateSub: NativeEventSubscription | undefined;
let appAway = false;
let lastFetchStartAt = 0;
let lastSuccessAt = 0;
let lastReturnFetchAt = 0;
let nativeFlight: NativeFlight = { state: 'none' };
const listeners = new Set<() => void>();

let snapshotCache: PriceSurfaceSnapshot = {
  loading: false,
  nextFetchAt: 0,
  nextFetchDelayMs: 0,
  surfaceActive: false,
};

function emit(): void {
  for (const l of listeners) l();
}

function clearAuto(): void {
  // A dead deadline must not linger: the ring reads it, and a stale one
  // renders as a full ring for a tick that will never come. The emit
  // wakes observers whose surfaceActive just went with the cadence.
  if (cadence.state === 'armed') {
    clearTimeout(cadence.timer);
  }
  cadence = { state: 'idle' };
  emit();
}

// A transport verdict under which the wallet refuses every price fetch
// by the route rule, so attempting is pure waste; the classification is
// the presenter's exhaustive switch, which a new indicator breaks.
function transportRefuses(): boolean {
  return (
    deps !== undefined &&
    transportDisposition(deps.mixnetStatusKey) === 'refusing'
  );
}

// The one gate every path consults: the consent, the market, an attached
// session, the foreground, and a transport that could serve. Hand-copied
// guard subsets drifted; this predicate is the single source.
function surfaceMayFetch(): boolean {
  return (
    deps !== undefined &&
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
  const delayMs =
    PRICE_REFRESH_MIN_MS +
    Math.random() * (PRICE_REFRESH_MAX_MS - PRICE_REFRESH_MIN_MS);
  const deadline = Date.now() + delayMs;
  cadence = {
    state: 'armed',
    deadline,
    delayMs,
    timer: setTimeout(() => {
      // 'due' first: a tick that fires into a state doFetch refuses
      // must not leave a dead handle blocking every reschedule, and the
      // kept deadline lets the ring stay full while the flight runs.
      cadence = { state: 'due', deadline, delayMs };
      doFetch(true).catch(() => {});
    }, delayMs),
  };
  emit();
}

function startNativeCall(): Promise<{ price: number; error: string }> {
  if (nativeFlight.state === 'inFlight') {
    if (Date.now() - nativeFlight.startedAt <= NATIVE_CALL_TTL_MS) {
      return nativeFlight.call;
    }
    // The cached call wedged past its TTL: retire the corpse so a fresh
    // request can run instead of reattaching to it forever.
  }
  const launched: Promise<{ price: number; error: string }> =
    getZecPrice().finally(() => {
      if (nativeFlight.state === 'inFlight' && nativeFlight.call === launched) {
        nativeFlight = { state: 'none' };
      }
    });
  nativeFlight = { state: 'inFlight', call: launched, startedAt: Date.now() };
  return launched;
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

// A status that could still be a bootstrap in progress: 'unknown' is
// one failed status poll, not a verdict, on the arm path exactly as on
// the drop path in pump().
function statusCouldBeBootstrap(key: MixnetStatusKey): boolean {
  return transportDisposition(key) === 'possibleBootstrap';
}

// A refusal may arm the ready follow-up from every launch path except
// the follow-up itself, which never re-arms.
async function doFetch(mayArmFollowUp: boolean): Promise<void> {
  if (loading || !surfaceMayFetch() || !deps) {
    return;
  }
  const d = deps;
  const epoch = sessionEpoch;
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
    if (
      price <= 0 &&
      price !== -3 &&
      epoch === sessionEpoch &&
      surfaceMayFetch()
    ) {
      // The consent re-check: no second attempt for a surface every
      // fetcher has left, for a backgrounded app, or after the Nym
      // opt-in was withdrawn mid-flight. A -3 means the bound expired
      // on a still-pending native call, and a retry would only reattach
      // to that same wedged promise for another bound of nothing.
      price = await boundedPrice();
    }

    if (epoch !== sessionEpoch) {
      // The session this flight belonged to detached: its state is gone
      // and nothing here may leak into the next one.
      return;
    }
    if (price > 0) {
      // The traffic was already spent under the launch's consent, so
      // the value is recorded even where a new fetch would now be
      // refused (a background hop, a moved verdict): discarding it
      // would only buy a second identical fetch later.
      followUpArmed = false;
      entryPending = false; // a fresh price satisfies a pending return
      lastSuccessAt = Date.now();
      d.setZecPrice(price, lastSuccessAt);
    } else if (
      mayArmFollowUp &&
      surfaceMayFetch() &&
      (statusCouldBeBootstrap(launchStatusKey) ||
        (deps ? statusCouldBeBootstrap(deps.mixnetStatusKey) : false))
    ) {
      // Refused during a possible bootstrap, judged by the launch
      // status or the live one: the ready follow-up recovers the price
      // seconds after the transport comes up instead of a full tick
      // later. The consent re-check keeps a flight that outlived a
      // background transition from re-arming what that transition
      // dropped, and the follow-up itself never re-arms. Every other
      // failure is silent; the last price stands and the stale cue
      // carries the signal.
      followUpArmed = true;
    }
  } finally {
    if (epoch === sessionEpoch) {
      loading = false;
      scheduleAuto();
      emit();
      if (entryPending) {
        // The parked return is consumed here whether or not its fetch
        // may fly: a return the landing declines must not survive to
        // double some later entry past the burst cooldown.
        entryPending = false;
        if (surfaceMayFetch() && deps) {
          lastReturnFetchAt = Date.now();
          doFetch(true).catch(() => {});
        }
      }
      pump(); // a follow-up that turned ready mid-flight fires now
    }
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
    doFetch(false).catch(() => {});
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
  if (!surfaceMayFetch() || loading || cadence.state === 'armed') {
    return;
  }
  if (Date.now() - lastFetchStartAt < FETCH_BURST_COOLDOWN_MS) {
    scheduleAuto();
  } else {
    doFetch(true).catch(() => {});
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
    if (transportRefuses()) {
      // A refusing verdict ends the cadence now, not at the next tick,
      // and clearAuto's emit takes the ring down with it.
      clearAuto();
      return;
    }
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
        // The session is over: sweep every clock and flag, or the next
        // wallet inherits this one's burst cooldowns, its in-flight
        // loading, and its wedged native call. The epoch bump makes an
        // orphan flight's landing a no-op.
        sessionEpoch++;
        appStateSub?.remove();
        appStateSub = undefined;
        followUpArmed = false;
        entryPending = false;
        loading = false;
        lastFetchStartAt = 0;
        lastSuccessAt = 0;
        lastReturnFetchAt = 0;
        nativeFlight = { state: 'none' };
        deps = undefined;
        clearAuto(); // last, so its emit publishes the swept state
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
    emit(); // surfaceActive may have just turned back on
    if (!surfaceMayFetch()) return;
    if (loading) {
      entryPending = true;
    } else if (
      Date.now() - lastSuccessAt < FETCH_BURST_COOLDOWN_MS ||
      Date.now() - lastReturnFetchAt < FETCH_BURST_COOLDOWN_MS
    ) {
      if (cadence.state !== 'armed') {
        scheduleAuto();
      }
    } else {
      lastReturnFetchAt = Date.now();
      doFetch(true).catch(() => {});
    }
  },
  snapshot(): PriceSurfaceSnapshot {
    // Recompute cheaply, but keep the object identity until a field
    // really moves: useSyncExternalStore treats a fresh identity as a
    // change and would loop on one allocated per call.
    const next: PriceSurfaceSnapshot = {
      loading,
      nextFetchAt: cadence.state === 'idle' ? 0 : cadence.deadline,
      nextFetchDelayMs: cadence.state === 'idle' ? 0 : cadence.delayMs,
      surfaceActive: surfaceMayFetch(),
    };
    if (
      next.loading !== snapshotCache.loading ||
      next.nextFetchAt !== snapshotCache.nextFetchAt ||
      next.nextFetchDelayMs !== snapshotCache.nextFetchDelayMs ||
      next.surfaceActive !== snapshotCache.surfaceActive
    ) {
      snapshotCache = next;
    }
    return snapshotCache;
  },
  /** Test-only: forget the burst clocks, the arm state, and any wedged in-flight native call. */
  resetForTests(): void {
    lastFetchStartAt = 0;
    lastSuccessAt = 0;
    lastReturnFetchAt = 0;
    followUpArmed = false;
    entryPending = false;
    nativeFlight = { state: 'none' };
    loading = false;
    if (staleCrossing.state === 'armed') {
      clearTimeout(staleCrossing.timer);
    }
    staleCrossing = { state: 'unarmed' };
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
export function usePriceFetcherStore(): PriceSurfaceSnapshot {
  // The built-in closes the render-to-subscribe window (the driver's
  // attach effect starts the boot fetch before a sibling's effects run)
  // and reads tear-free under concurrent rendering.
  return useSyncExternalStore(
    priceFetcherStore.subscribe,
    priceFetcherStore.snapshot,
  );
}

// ONE wall-clock crossing timer for however many components watch the
// same price, instead of one duplicate setTimeout per mounted amount.
type StaleCrossing =
  | { state: 'unarmed' }
  | {
      state: 'armed';
      timer: ReturnType<typeof setTimeout>;
      priceDate: number;
    };

const staleListeners = new Set<() => void>();
let staleCrossing: StaleCrossing = { state: 'unarmed' };

function armStaleCrossing(priceDate: number): void {
  if (priceDate <= 0) return;
  if (staleCrossing.state === 'armed') {
    if (staleCrossing.priceDate === priceDate) return;
    clearTimeout(staleCrossing.timer);
    staleCrossing = { state: 'unarmed' };
  }
  const untilStale = priceDate + PRICE_STALE_MS - Date.now();
  if (untilStale <= 0) return;
  staleCrossing = {
    state: 'armed',
    priceDate,
    timer: setTimeout(() => {
      staleCrossing = { state: 'unarmed' };
      for (const l of staleListeners) l();
    }, untilStale + 50),
  };
}

/** Whether the price at `priceDate` is stale, re-rendering the caller at the shared wall-clock crossing. */
export function usePriceStale(priceDate: number): boolean {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    staleListeners.add(force);
    armStaleCrossing(priceDate);
    return () => {
      staleListeners.delete(force);
    };
  }, [priceDate]);
  return priceDate > 0 && Date.now() - priceDate > PRICE_STALE_MS;
}
