/**
 * The wall clock as a store, updated once a minute: one interval serves every
 * reader on screen.
 */

const MINUTE_MS = 60 * 1000;

let bucket = Math.floor(Date.now() / MINUTE_MS);
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

/** Re-reads the clock and notifies the listeners when the minute moved. */
function tick(): void {
  const next = Math.floor(Date.now() / MINUTE_MS);
  if (next === bucket) {
    return;
  }
  bucket = next;
  listeners.forEach(listener => listener());
}

export function subscribeClock(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(tick, MINUTE_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      clearInterval(timer);
    }
  };
}

export function clockMs(): number {
  return bucket * MINUTE_MS;
}
