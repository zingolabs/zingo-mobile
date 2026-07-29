import { isMixnetAlwaysOn } from './nymTransport';

/**
 * The always-on flavors' fail-closed gate state (CONTEXT.md: Fail-closed).
 *
 * Both covered surfaces — transaction broadcast and the CEX price fetch —
 * must refuse rather than touch clearnet while the mixnet transport is not
 * `ready`. The send path consults its coordinator instance directly; the
 * price path runs through a detached module store with no coordinator
 * access, so the coordinator mirrors its readiness here on every
 * publication (and clears it on stop).
 *
 * In the stock flavors this module is inert: `coveredSurfacePermitted`
 * is unconditionally true there, because the rendered mixnet UI already
 * gates sends, and `off` is a consented clearnet state.
 */
let transportReady = false;

/** Recorded by the MixnetCoordinator; not for screens or stores to call. */
export function recordMixnetTransportReady(ready: boolean): void {
  transportReady = ready;
}

/**
 * Whether a covered surface (send, price fetch) may proceed right now.
 * False only in an always-on build whose transport is not `ready`.
 */
export function coveredSurfacePermitted(): boolean {
  return !isMixnetAlwaysOn() || transportReady;
}

/**
 * The refusal text for a covered surface blocked by the gate. Carries the
 * "Nym mixnet" marker, so classifySendFailure files it as mixnetRefusal —
 * never a server problem, never retried elsewhere.
 */
export const COVERED_SURFACE_REFUSAL =
  'Error: refused: the Nym mixnet transport is not ready, and this always-on build never falls back to clearnet';
