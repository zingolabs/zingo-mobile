import { useEffect, useReducer } from 'react';
import { getZecPrice } from '../../app/walletBackend';

/**
 * Shared, singleton state for every <PriceFetcher/> on screen.
 *
 * Why a module store instead of per-component state: there are several price
 * fetchers mounted at once (Send amount row, header balance row, …). If each
 * ran its own timer and `loading`/`started` state they would drift out of sync
 * and — worse — each would fire its own network request every cycle. Here a
 * single source of truth drives all of them:
 *   - ONE auto-refresh timer (fires while at least one fetcher is mounted and
 *     the user has fetched at least once).
 *   - Shared `loading` + a 5 s post-fetch `cooldown` so rapid taps across ANY
 *     instance can't spam the price backend (mirrors the swap manual-refresh
 *     cooldown).
 *   - Shared `started` flag so all instances flip from the idle icon to the
 *     countdown ring together, after the first successful fetch.
 *
 * The ring animation itself is already synchronised for free: it fills off
 * `zecPrice.date` (app context), which every instance reads.
 */

export const PRICE_AUTO_REFRESH_MS = 60_000;
const COOLDOWN_MS = 5_000;
// Keep `loading` up at least this long so the "Refreshing price" CTA label and
// the ring dim are perceptible even when the price call returns almost instantly.
const MIN_VISIBLE_MS = 800;

type Deps = {
  setZecPrice: (price: number, date: number) => void;
  translate: (key: string) => unknown;
  addLastSnackbar: (message: string) => void;
};

let started = false;
let loading = false;
let cooldownUntil = 0;
let deps: Deps | null = null;
let autoTimer: ReturnType<typeof setTimeout> | null = null;
let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
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
  if (listeners.size === 0 || !started) return;
  autoTimer = setTimeout(() => {
    doFetch().catch(() => {});
  }, PRICE_AUTO_REFRESH_MS);
}

async function doFetch(): Promise<void> {
  const now = Date.now();
  // Anti-spam gate: ignore while a fetch is in flight or inside the 5 s
  // cooldown. The auto timer (60 s) never trips this; rapid taps do.
  if (loading || now < cooldownUntil || !deps) return;
  const d = deps;

  loading = true;
  cooldownUntil = now + COOLDOWN_MS;
  emit();
  // Re-notify when the cooldown lapses so the control re-enables even if no
  // other state change happens meanwhile.
  if (cooldownTimer) clearTimeout(cooldownTimer);
  cooldownTimer = setTimeout(emit, COOLDOWN_MS);

  let price: number;
  let error: string;
  // first attempt
  ({ price, error } = await getZecPrice());
  // 0 initial · -1 Gemini/zingolib · -2 RPCModule · >0 real value
  if (price <= 0) {
    // second attempt
    ({ price, error } = await getZecPrice());
  }

  if (price === -1) {
    d.addLastSnackbar(
      `${d.translate('info.errorgemini') as string} - ${error}`,
    );
  } else if (price === -2) {
    d.addLastSnackbar(
      `${d.translate('info.errorrpcmodule') as string} - ${error}`,
    );
  } else if (price <= 0) {
    d.addLastSnackbar(
      `${d.translate('info.errorgemini') as string} - ${error}`,
    );
    d.setZecPrice(price, 0);
  } else {
    d.setZecPrice(price, Date.now());
    started = true;
  }

  // Floor the visible loading time so the CTA/ring state doesn't flash by.
  const elapsed = Date.now() - now;
  if (elapsed < MIN_VISIBLE_MS) {
    await new Promise<void>(resolve =>
      setTimeout(resolve, MIN_VISIBLE_MS - elapsed),
    );
  }

  loading = false;
  emit();
  scheduleAuto();
}

export const priceFetcherStore = {
  /** Keep the latest context-bound callbacks (same across all instances). */
  setDeps(d: Deps): void {
    deps = d;
  },
  /** User- or timer-initiated fetch. No-ops while loading / cooling down. */
  fetch(): void {
    doFetch().catch(() => {});
  },
  hasStarted(): boolean {
    return started;
  },
  snapshot(): { started: boolean; loading: boolean; coolingDown: boolean } {
    return { started, loading, coolingDown: Date.now() < cooldownUntil };
  },
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    // Resume the auto timer when the first fetcher (re)mounts after a start.
    if (started && !autoTimer) scheduleAuto();
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
