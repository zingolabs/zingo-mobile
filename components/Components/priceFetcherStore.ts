import { useEffect, useReducer, useSyncExternalStore } from 'react';
import { AppState, NativeEventSubscription } from 'react-native';
import { getZecPrice } from '../../app/walletBackend';
import {
  MixnetStatusKey,
  fetchPolicy,
} from '../../app/walletBackend/transforms/mixnetView';

/**
 * Shared, singleton state for the price surface's fetch lifecycle.
 *
 * The price surface has no manual fetch. Consent is the Nym opt-in or an
 * explicit switch-off, which serves the fetch over clearnet. The
 * PriceTrafficDriver mounted by LoadedApp attaches here for the wallet
 * session and carries the consent bit in its deps, so the displayed
 * currency never decides what may be fetched; PriceFetcher and
 * usePriceFetcherStore only observe. The store owns the whole lifecycle:
 *   - ONE auto-refresh timer while the driver is attached, the gate-open
 *     foreground holds, and the transport is not a refusing policy
 *     ('died'): each fetch schedules the next at a uniform random delay
 *     of five to ten minutes. A background transition pauses the
 *     cadence, and iOS 'inactive' (Control Center, the app's own Face ID
 *     sheet) is a non-event.
 *   - A fetch at every entry: attach (boot), the consent turning on, and
 *     LoadedApp's foreground gate opening after a real background return
 *     (never on the raw AppState event, which races a locked,
 *     unauthenticated wallet). Entry fetches inside the burst cooldown of
 *     the last start or last success yield to the cadence.
 *   - The ready follow-up: an unattended fetch refused during bootstrap
 *     arms a one-shot fetch that fires when the Indicator turns ready.
 *     It is dropped on a background transition and on a 'died' policy,
 *     survives an in-flight fetch, and a transient 'unknown' status poll
 *     never drops it.
 *   - No snackbars. A failure leaves the last price standing; the stale
 *     cue is the only failure signal.
 */

// Each fetch schedules the next at a uniform draw from this window.
export const PRICE_REFRESH_MIN_MS = 5 * 60_000;
export const PRICE_REFRESH_MAX_MS = 10 * 60_000;
// The JS-side bound on one native price call: a wedged FFI promise must
// never pin `loading` for the process lifetime.
const PRICE_FETCH_TIMEOUT_MS = 30_000;
// A price older than this wall-clock age is stale: the cadence ceiling
// plus one fetch bound of headroom, so a healthy cadence never dims,
// not even on a ceiling draw's latency.
export const PRICE_STALE_MS = PRICE_REFRESH_MAX_MS + PRICE_FETCH_TIMEOUT_MS;
// Rapid remounts and app hops must not multiply fetches.
const FETCH_BURST_COOLDOWN_MS = 5_000;
// A wedged native call is reused until this age, then retired so a fresh
// request can run: bounded orphans, never a corpse cached forever.
const NATIVE_CALL_TTL_MS = 5 * 60_000;

type PriceInputs = {
  setZecPrice: (price: number, date: number) => void;
  // The live Indicator key; 'mixnet.status.unknown' before a publication.
  mixnetStatusKey: MixnetStatusKey;
  // The persisted Nym opt-in.
  nymSelected: boolean;
  // Whether the price source is fetchable for the current Zcash network.
  priceFetchable: boolean;
};

// What every observer reads: identity-stable between real changes, as
// useSyncExternalStore requires.
type PriceSurfaceSnapshot = {
  loading: boolean;
  nextFetchAt: number;
  nextFetchDelayMs: number;
  // The store's own render decision, so no view re-derives (and drifts
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
let deps: PriceInputs | undefined;
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

// A transport policy under which the wallet refuses every price fetch
// by the route rule, so attempting is pure waste; the classification is
// fetchPolicy's exhaustive switch, which a new indicator breaks.
function transportRefuses(): boolean {
  return (
    deps !== undefined &&
    fetchPolicy(deps.mixnetStatusKey) === 'refusing'
  );
}

// The one gate every path consults: the consent, the market, an attached
// session, the foreground, and a transport that could serve. Hand-copied
// guard subsets drifted; this predicate is the single source.
function surfaceMayFetch(): boolean {
  return (
    deps !== undefined &&
    priceTrafficConsented() &&
    deps.priceFetchable &&
    attachCount > 0 &&
    !appAway &&
    !transportRefuses()
  );
}

function priceTrafficConsented(): boolean {
  if (deps === undefined) return false;
  if (deps.nymSelected) {
    return deps.mixnetStatusKey !== 'mixnet.status.off';
  }
  return (
    deps.mixnetStatusKey !== 'mixnet.status.ready' &&
    deps.mixnetStatusKey !== 'mixnet.status.bootstrapping'
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
  } catch {
    // A rejection (a native member missing on one platform, a mock
    // resolving nothing) reads as the RPCModule sentinel, so the retry
    // and the follow-up arm run exactly as for a resolved refusal.
    return -2;
  } finally {
    clearTimeout(bound);
  }
}

// A status that could still be a bootstrap in progress: 'unknown' is
// one failed status poll, not a policy, on the arm path exactly as on
// the drop path in pump().
function statusCouldBeBootstrap(key: MixnetStatusKey): boolean {
  return fetchPolicy(key) === 'possibleBootstrap';
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
      // refused (a background hop, a moved policy): discarding it
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
    // A real transport policy ends the bootstrap the arm belonged to.
    // 'unknown' is one failed status poll, not a policy, and a
    // bootstrap's polls are flakiest exactly while the arm matters, so
    // both it and 'bootstrapping' keep the arm standing.
    followUpArmed = false;
  }
}

// The seam attach and setDeps share: every entry (boot, the consent
// turning on, a recovered surface) fetches at once. A running timer or
// flight means the cadence already owns the surface, a start inside
// the burst cooldown (a remount storm) yields to it, and so does an
// entry whose price is younger than the cadence floor: a flapping
// transport or a market hop re-arms the timer instead of spending a
// fetch per reconnect on a window the consent already covered.
function entryOrSchedule(): void {
  if (!surfaceMayFetch() || loading || cadence.state === 'armed') {
    return;
  }
  if (
    Date.now() - lastFetchStartAt < FETCH_BURST_COOLDOWN_MS ||
    Date.now() - lastSuccessAt < PRICE_REFRESH_MIN_MS
  ) {
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
  setDeps(d: PriceInputs): void {
    deps = d;
    pump();
    if (!surfaceMayFetch()) {
      clearAuto();
      followUpArmed = false;
      entryPending = false;
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

/** Whether the price at `priceDate` is stale, re-rendering the caller at its own wall-clock crossing. */
export function usePriceStale(priceDate: number): boolean {
  const [, force] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (priceDate <= 0) {
      return;
    }
    const untilStale = priceDate + PRICE_STALE_MS - Date.now();
    if (untilStale <= 0) {
      return;
    }
    // The crossing timer lives and dies with its consumer: no clock
    // outlives an unmount, and no second price evicts another
    // consumer's crossing.
    const timer = setTimeout(force, untilStale + 50);
    return () => clearTimeout(timer);
  }, [priceDate]);
  return priceDate > 0 && Date.now() - priceDate > PRICE_STALE_MS;
}

/** The price's health for display muting. */
export type PriceHealth = 'live' | 'stale' | 'absent';

/** The one spelling of the muting rule: absent before a first price, stale past the crossing, live otherwise (an omitted date is a historical conversion, always live). */
export function usePriceHealth(priceDate: number | undefined): PriceHealth {
  const stale = usePriceStale(priceDate ?? 0);
  if (priceDate === 0) {
    return 'absent';
  }
  return stale ? 'stale' : 'live';
}
