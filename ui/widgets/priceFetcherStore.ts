import { useEffect, useReducer, useSyncExternalStore } from 'react';
import { AppState, NativeEventSubscription } from 'react-native';
import { getZecPrice } from '@app/walletBackend';
import { MixnetStatusKey } from '@app/walletBackend/transforms/mixnetView';

// Singleton lifecycle of the price surface: it fetches through the ready mixnet only, once a minute.

export const PRICE_REFRESH_MS = 60_000;
const PRICE_FETCH_TIMEOUT_MS = 30_000;
export const PRICE_STALE_MS = PRICE_REFRESH_MS + PRICE_FETCH_TIMEOUT_MS;
const FETCH_BURST_COOLDOWN_MS = 5_000;
const NATIVE_CALL_TTL_MS = 5 * 60_000;

type PriceInputs = {
  setZecPrice: (price: number, date: number) => void;
  mixnetStatusKey: MixnetStatusKey;
  priceFetchable: boolean;
};

type PriceSurfaceSnapshot = {
  loading: boolean;
  nextFetchAt: number;
  nextFetchDelayMs: number;
  surfaceActive: boolean;
};

type Cadence =
  | { state: 'idle' }
  | {
      state: 'armed';
      timer: ReturnType<typeof setTimeout>;
      deadline: number;
      delayMs: number;
    }
  | { state: 'due'; deadline: number; delayMs: number };

type NativeFlight =
  | { state: 'none' }
  | {
      state: 'inFlight';
      call: Promise<{ price: number; error: string }>;
      startedAt: number;
    };

let loading = false;
let entryPending = false;
let deps: PriceInputs | undefined;
let cadence: Cadence = { state: 'idle' };
let attachCount = 0;
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
  if (cadence.state === 'armed') {
    clearTimeout(cadence.timer);
  }
  cadence = { state: 'idle' };
  emit();
}

function surfaceMayFetch(): boolean {
  return (
    deps !== undefined &&
    deps.mixnetStatusKey === 'mixnet.status.ready' &&
    deps.priceFetchable &&
    attachCount > 0 &&
    !appAway
  );
}

function scheduleAuto(): void {
  clearAuto();
  if (!surfaceMayFetch()) return;
  const delayMs = PRICE_REFRESH_MS;
  const deadline = Date.now() + delayMs;
  cadence = {
    state: 'armed',
    deadline,
    delayMs,
    timer: setTimeout(() => {
      cadence = { state: 'due', deadline, delayMs };
      doFetch().catch(() => {});
    }, delayMs),
  };
  emit();
}

// A wedged native call is reused until its TTL, then replaced.
function startNativeCall(): Promise<{ price: number; error: string }> {
  if (
    nativeFlight.state === 'inFlight' &&
    Date.now() - nativeFlight.startedAt <= NATIVE_CALL_TTL_MS
  ) {
    return nativeFlight.call;
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

// Resolves -3 on timeout and -2 on a rejected native call.
async function boundedPrice(): Promise<number> {
  let bound: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<{ price: number }>(resolve => {
    bound = setTimeout(() => resolve({ price: -3 }), PRICE_FETCH_TIMEOUT_MS);
  });
  try {
    const { price } = await Promise.race([startNativeCall(), expiry]);
    return price;
  } catch {
    return -2;
  } finally {
    clearTimeout(bound);
  }
}

async function doFetch(): Promise<void> {
  if (loading || !surfaceMayFetch() || !deps) {
    return;
  }
  const d = deps;
  const epoch = sessionEpoch;

  loading = true;
  lastFetchStartAt = Date.now();
  emit();
  try {
    let price = await boundedPrice();
    if (
      price <= 0 &&
      price !== -3 &&
      epoch === sessionEpoch &&
      surfaceMayFetch()
    ) {
      price = await boundedPrice();
    }

    if (epoch !== sessionEpoch) {
      return;
    }
    if (price > 0) {
      entryPending = false;
      lastSuccessAt = Date.now();
      d.setZecPrice(price, lastSuccessAt);
    }
  } finally {
    if (epoch === sessionEpoch) {
      loading = false;
      scheduleAuto();
      emit();
      if (entryPending) {
        entryPending = false;
        if (surfaceMayFetch() && deps) {
          lastReturnFetchAt = Date.now();
          doFetch().catch(() => {});
        }
      }
    }
  }
}

function entryOrSchedule(): void {
  if (!surfaceMayFetch() || loading || cadence.state === 'armed') {
    return;
  }
  if (
    Date.now() - lastFetchStartAt < FETCH_BURST_COOLDOWN_MS ||
    Date.now() - lastSuccessAt < PRICE_REFRESH_MS
  ) {
    scheduleAuto();
  } else {
    doFetch().catch(() => {});
  }
}

// Only foregroundReturned ends the pause, because 'active' can be a locked wallet.
function onAppStateChange(next: string): void {
  if (next === 'background') {
    appAway = true;
    entryPending = false;
    clearAuto();
  }
}

export const priceFetcherStore = {
  setDeps(d: PriceInputs): void {
    deps = d;
    if (!surfaceMayFetch()) {
      clearAuto();
      entryPending = false;
      return;
    }
    entryOrSchedule();
  },
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
        sessionEpoch++;
        appStateSub?.remove();
        appStateSub = undefined;
        entryPending = false;
        loading = false;
        lastFetchStartAt = 0;
        lastSuccessAt = 0;
        lastReturnFetchAt = 0;
        nativeFlight = { state: 'none' };
        deps = undefined;
        clearAuto();
      }
    };
  },
  foregroundReturned(): void {
    appAway = false;
    emit();
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
      doFetch().catch(() => {});
    }
  },
  snapshot(): PriceSurfaceSnapshot {
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
  resetForTests(): void {
    lastFetchStartAt = 0;
    lastSuccessAt = 0;
    lastReturnFetchAt = 0;
    entryPending = false;
    nativeFlight = { state: 'none' };
    loading = false;
    clearAuto();
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export function usePriceFetcherStore(): PriceSurfaceSnapshot {
  return useSyncExternalStore(
    priceFetcherStore.subscribe,
    priceFetcherStore.snapshot,
  );
}

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
    const timer = setTimeout(force, untilStale + 50);
    return () => clearTimeout(timer);
  }, [priceDate]);
  return priceDate > 0 && Date.now() - priceDate > PRICE_STALE_MS;
}

export type PriceHealth = 'live' | 'stale' | 'absent';

// An omitted date is a historical conversion and reads live.
export function usePriceHealth(priceDate: number | undefined): PriceHealth {
  const stale = usePriceStale(priceDate ?? 0);
  if (priceDate === 0) {
    return 'absent';
  }
  return stale ? 'stale' : 'live';
}
