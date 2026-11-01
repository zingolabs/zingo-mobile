/**
 * How fresh the wallet's view of the chain is, from the two heights the
 * backend already reads on every tick: the wallet's (what it has scanned)
 * and the server's tip.
 *
 * `caughtUpAtMs` is the last moment the wallet was seen at the tip. While
 * syncing works it keeps moving, so the balance never needs an age; it only
 * stops when the wallet stops keeping up (no internet, Offline, or a sync
 * that no longer advances), and then it says how old the balance is. Under
 * continuous sync the same heights hold, so nothing here changes.
 */

/** A wallet this close to the tip is caught up: a new block is mid-scan. */
const CAUGHT_UP_SLACK = 1;

export type SyncFreshness = {
  walletHeight: number;
  serverHeight: number;
  /** Milliseconds since the epoch, or 0 while this session has not seen it caught up. */
  caughtUpAtMs: number;
};

let state: SyncFreshness = {
  walletHeight: 0,
  serverHeight: 0,
  caughtUpAtMs: 0,
};
const listeners = new Set<() => void>();
const publish = (next: SyncFreshness) => {
  state = next;
  listeners.forEach(listener => listener());
};

/** Records the heights just read; a wallet at the tip marks the moment. */
export function noteHeights(
  walletHeight: number,
  serverHeight: number,
  nowMs: number,
): void {
  const known = walletHeight > 0 && serverHeight > 0;
  const caughtUp = known && serverHeight - walletHeight <= CAUGHT_UP_SLACK;
  publish({
    walletHeight,
    serverHeight,
    caughtUpAtMs: caughtUp ? nowMs : state.caughtUpAtMs,
  });
}

/** Forgets what was seen, for another wallet. */
export function resetFreshness(): void {
  publish({ walletHeight: 0, serverHeight: 0, caughtUpAtMs: 0 });
}

export function getFreshness(): SyncFreshness {
  return state;
}

export function subscribeFreshness(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Blocks behind the tip before a stalled sync is told. */
export const BEHIND_BLOCKS = 2;
/** How long the wallet has to stay behind before it is told: a few blocks' time. */
export const BEHIND_MS = 5 * 60 * 1000;

/**
 * The sync no longer keeps up: the wallet trails the tip by a couple of
 * blocks and has not been at it for a while. A new block mid-scan is not
 * this; neither is a first sync, which the sync line shows as syncing.
 */
export function isFallingBehind(f: SyncFreshness, nowMs: number): boolean {
  const known = f.walletHeight > 0 && f.serverHeight > 0;
  return (
    known &&
    f.serverHeight - f.walletHeight >= BEHIND_BLOCKS &&
    f.caughtUpAtMs > 0 &&
    nowMs - f.caughtUpAtMs >= BEHIND_MS
  );
}
