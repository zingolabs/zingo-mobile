// The Jotai holder and lane for the price slice. The value rides `priceAtom`,
// the fetch status `priceStatusAtom`, and the derived `priceViewAtom` gates
// notifications so a price tick wakes only price consumers.
//
// PriceLane is one per container instance: a single self-rescheduling 60s
// handle, epoch-dropped, gated on ≥1 subscriber, torn down with the instance.
// `started`, `cooldownUntil`, and the deps live in the container's store, so
// they do not outlive a reset and no timer or stale write survives teardown.

import { atom, createStore, useAtomValue } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useEffect } from 'react';

import type ZecPriceType from './types/ZecPriceType';
import {
  type PriceErrorKey,
  type PriceFetchStatus,
  type PriceSlice,
  type ZecPriceFetch,
  initialPriceSlice,
  priceView,
  sliceFromFetch,
} from './price';
import { getZecPrice } from '../walletBackend/utils/walletUtils';

type JotaiStore = ReturnType<typeof createStore>;

export const PRICE_AUTO_REFRESH_MS = 60_000;
const COOLDOWN_MS = 5_000;
// Hold `fetching` at least this long so the "Refreshing price" CTA and the ring
// dim register even when the price call returns almost instantly.
const MIN_VISIBLE_MS = 800;

// The held value. Only the lane writes it. A fresh store starts unpriced.
export const priceAtom = atom<PriceSlice>(initialPriceSlice);

// The fetch status, held apart from the value. `fetching` disables the ring and
// drives the CTA; `cooling` keeps it disabled through the anti-spam window.
export const priceStatusAtom = atom<PriceFetchStatus>('idle');

const priceEq = (a: ZecPriceType, b: ZecPriceType): boolean =>
  a.zecPrice === b.zecPrice && a.date === b.date;

// selectAtom recomputes on any slice change but notifies only when the
// displayed {zecPrice,date} differs, and keeps identity while it does not — so
// a memoized PriceRow holds across unrelated container commits.
export const priceViewAtom = selectAtom(priceAtom, priceView, priceEq);

export interface PriceLaneHandle {
  subscribe(): () => void;
  fetch(): void;
}

// The default before the container binds its lane. subscribe/fetch are inert,
// so a consumer rendered without a bound lane (a standalone snapshot) reads the
// atom defaults and drives nothing.
export const inertPriceLane: PriceLaneHandle = {
  subscribe: () => () => {},
  fetch: () => {},
};

export const priceLaneAtom = atom<PriceLaneHandle>(inertPriceLane);

type LaneDeps = {
  onError: (key: PriceErrorKey) => void;
  fetchPrice?: () => Promise<ZecPriceFetch>;
};

export class PriceLane implements PriceLaneHandle {
  private epoch = 0;
  private subscribers = 0;
  private inFlight = false;
  private cooldownUntil = 0;
  private autoTimer?: ReturnType<typeof setTimeout>;
  private cooldownTimer?: ReturnType<typeof setTimeout>;
  private readonly fetchPrice: () => Promise<ZecPriceFetch>;

  constructor(private store: JotaiStore, private deps: LaneDeps) {
    this.fetchPrice = deps.fetchPrice ?? getZecPrice;
  }

  // A price is "started" once the store holds a real value, so the ring
  // replaces the idle icon and the auto-refresh runs. Derived from the store,
  // never a surviving flag.
  private started(): boolean {
    return this.store.get(priceAtom).kind === 'priced';
  }

  subscribe(): () => void {
    this.subscribers += 1;
    if (this.autoTimer === undefined) {
      this.scheduleAuto();
    }
    return () => {
      this.subscribers -= 1;
      if (this.subscribers === 0) {
        this.clearAuto();
      }
    };
  }

  private clearAuto(): void {
    if (this.autoTimer !== undefined) {
      clearTimeout(this.autoTimer);
      this.autoTimer = undefined;
    }
  }

  private scheduleAuto(): void {
    this.clearAuto();
    if (this.subscribers === 0 || !this.started()) {
      return;
    }
    this.autoTimer = setTimeout(() => {
      void this.run();
    }, PRICE_AUTO_REFRESH_MS);
  }

  // User- or timer-initiated. No-ops while a fetch is in flight or inside the
  // 5s cooldown; the 60s auto tick never trips the cooldown, rapid taps do.
  fetch(): void {
    void this.run();
  }

  private async run(): Promise<void> {
    const now = Date.now();
    if (this.inFlight || now < this.cooldownUntil) {
      return;
    }
    const epoch = this.epoch;
    this.inFlight = true;
    this.cooldownUntil = now + COOLDOWN_MS;
    this.store.set(priceStatusAtom, 'fetching');

    let result = await this.fetchPrice();
    if (result.kind !== 'priced') {
      result = await this.fetchPrice();
    }

    // Floor the visible fetching time so the CTA/ring state does not flash by.
    const elapsed = Date.now() - now;
    if (elapsed < MIN_VISIBLE_MS) {
      await new Promise<void>(resolve =>
        setTimeout(resolve, MIN_VISIBLE_MS - elapsed),
      );
    }

    // Epoch drop: a teardown or reset between launch and here discards the
    // write, so the after-unmount setZecPrice fault cannot fire.
    if (this.epoch !== epoch) {
      return;
    }
    this.inFlight = false;
    this.land(result);
    this.store.set(
      priceStatusAtom,
      Date.now() < this.cooldownUntil ? 'cooling' : 'idle',
    );
    this.armCooldownReset(epoch);
    this.scheduleAuto();
  }

  private land(result: ZecPriceFetch): void {
    if (result.kind === 'priced') {
      this.store.set(priceAtom, sliceFromFetch(result, Date.now()));
      return;
    }
    // A missing price reads as the oracle problem the old 0-sentinel snackbar
    // reported. Surface it, but keep a prior price on screen — only blank when
    // there was never one.
    this.deps.onError(result.kind === 'error' ? result.errorKey : 'price.gemini');
    if (!this.started()) {
      this.store.set(
        priceAtom,
        result.kind === 'error' ? result : initialPriceSlice,
      );
    }
  }

  // Re-enable the control when the anti-spam window lapses, measured from the
  // launch, so a slow fetch does not stretch the cooldown past its 5s.
  private armCooldownReset(epoch: number): void {
    if (this.cooldownTimer !== undefined) {
      clearTimeout(this.cooldownTimer);
    }
    const remaining = Math.max(0, this.cooldownUntil - Date.now());
    this.cooldownTimer = setTimeout(() => {
      if (this.epoch === epoch && !this.inFlight) {
        this.store.set(priceStatusAtom, 'idle');
      }
    }, remaining);
  }

  // Called by the container on unmount and reset. Bumps the epoch so an
  // in-flight fetch drops its write, and clears both timers so nothing outlives
  // the instance.
  teardown(): void {
    this.epoch += 1;
    this.clearAuto();
    if (this.cooldownTimer !== undefined) {
      clearTimeout(this.cooldownTimer);
      this.cooldownTimer = undefined;
    }
    this.inFlight = false;
    this.subscribers = 0;
  }
}

// The value, as the legacy display shape. Referentially stable while the
// displayed price holds, so it is safe to pass to a memoized child.
export const usePrice = (): ZecPriceType => useAtomValue(priceViewAtom);

// Subscribes a fetcher to the lane (gating the auto-refresh on ≥1 mounted
// consumer) and reads the status the PriceFetcher ring and Send CTA render.
export function usePriceFetcher(): {
  started: boolean;
  loading: boolean;
  coolingDown: boolean;
} {
  const lane = useAtomValue(priceLaneAtom);
  const slice = useAtomValue(priceAtom);
  const status = useAtomValue(priceStatusAtom);
  useEffect(() => lane.subscribe(), [lane]);
  return {
    started: slice.kind === 'priced',
    loading: status === 'fetching',
    coolingDown: status === 'cooling',
  };
}
