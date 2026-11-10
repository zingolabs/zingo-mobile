/**
 * The wall clock as a store, struck once a minute: one interval serves every
 * reader on screen.
 */

const MINUTE_MS = 60 * 1000;

let bucket = Math.floor(Date.now() / MINUTE_MS);
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | undefined;

function strike(): void {
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
    timer = setInterval(strike, MINUTE_MS);
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
