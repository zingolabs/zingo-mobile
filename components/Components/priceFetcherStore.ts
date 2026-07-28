import { useEffect, useReducer } from 'react';
import { TranslateType } from '../../app/AppState';
import { createAlert } from '../../app/createAlert';
import { sendEmail } from '../../app/sendEmail';
import {
  getZecPrice,
  zecPriceFailureReport,
  ZecPriceOutcome,
} from '../../app/walletBackend';

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
 *     instance can't spam the price backend.
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
  translate: (key: string) => TranslateType;
  addLastSnackbar: (message: string) => void;
  setBackgroundError: (title: string, error: string) => void;
  zingolibVersion: string;
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
    doFetch(false).catch(() => {});
  }, PRICE_AUTO_REFRESH_MS);
}

/**
 * Surfaces one failed fetch. A user-initiated failure gets the full
 * [`zecPriceFailureReport`] in an alert whose Support button emails the
 * report with device and version info, the channel a tester forwards to
 * the developers. The 60 s auto-refresh keeps to a snackbar carrying the
 * report's first detail line, since a modal firing on a timer would
 * interrupt whatever the user is doing.
 *
 * Exported for its unit test; the store is its only production caller.
 */
export async function surfacePriceFailure(
  outcome: ZecPriceOutcome,
  userInitiated: boolean,
  d: Pick<
    Deps,
    'translate' | 'addLastSnackbar' | 'setBackgroundError' | 'zingolibVersion'
  >,
): Promise<void> {
  const report = zecPriceFailureReport(outcome);
  if (report === null) {
    return;
  }
  const title =
    outcome.kind === 'malformedPayload'
      ? (d.translate('info.errorrpcmodule') as string)
      : (d.translate('info.errorgemini') as string);
  if (userInitiated) {
    await createAlert(
      d.setBackgroundError,
      d.addLastSnackbar,
      title,
      report,
      false,
      d.translate,
      sendEmail,
      d.zingolibVersion,
    );
  } else {
    const detail = report.split('\n')[1] ?? report;
    d.addLastSnackbar(`${title} - ${detail}`);
  }
}

/**
 * The single-flight retry gate, exhaustive over the outcome union (ADR
 * 0004): a new arm fails compilation here until it declares its retry
 * policy. The one immediate retry is reserved for attempts that settled
 * natively. A `timedOut` attempt's native call may still be in flight,
 * so a retry would stack a second call behind it, and a fail-closed
 * `gateRefusal` is never retried.
 */
const RETRY_WHEN: { [K in ZecPriceOutcome['kind']]: boolean } = {
  price: false,
  noData: true,
  oracleError: true,
  malformedPayload: true,
  ffiRejection: true,
  timedOut: false,
  gateRefusal: false,
};

async function doFetch(userInitiated: boolean): Promise<void> {
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

  // first attempt, and one retry only when the attempt settled natively
  let outcome: ZecPriceOutcome = await getZecPrice();
  if (RETRY_WHEN[outcome.kind]) {
    outcome = await getZecPrice();
  }

  // Per-arm rendering lives in zecPriceFailureReport, which is exhaustive
  // by construction: a new ZecPriceOutcome arm fails compilation there
  // until it declares its report.
  if (outcome.kind === 'price') {
    d.setZecPrice(outcome.usd, Date.now());
    started = true;
    // A user asking for the price is also asking which route carried it
    // (the route attestation is the point of ZIP-318's price coverage), so
    // a manual fetch names its transport and duration. The auto-refresh
    // stays silent on success, as before.
    if (userInitiated) {
      const label =
        outcome.route.kind === 'attested'
          ? (d.translate('pricefetcher.updated-mixnet') as string)
          : outcome.route.kind === 'clearnet'
            ? (d.translate('pricefetcher.updated-clearnet') as string)
            : (d.translate('pricefetcher.updated') as string);
      d.addLastSnackbar(`${label} (${(outcome.elapsedMs / 1000).toFixed(1)} s)`);
    }
  } else {
    if (outcome.kind === 'noData') {
      d.setZecPrice(0, 0);
    }
    await surfacePriceFailure(outcome, userInitiated, d);
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
  /** User-initiated fetch. No-ops while loading / cooling down. */
  fetch(): void {
    doFetch(true).catch(() => {});
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
