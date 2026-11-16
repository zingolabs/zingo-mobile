/**
 * The wall clock as a store, updated once a minute: one interval serves every
 * reader on screen.
 */

const MINUTE_MS = 60 * 1000;

/** The timer primitives the clock runs on. */
export type ClockTimers = {
  setTimeout(callback: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(callback: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
};

/** What the clock engine reads the time from and runs its timers with. */
export type ClockIo = {
  now: () => number;
  timers: ClockTimers;
};

/** A minute-resolution clock store: a listener set and a cached minute. */
export type Clock = {
  subscribe(listener: () => void): () => void;
  read(): number;
};

/**
 * Builds the clock engine: minute buckets, ticks aligned to the boundary, a
 * timer that lives exactly as long as the listener set.
 */
export function createClock(io: ClockIo): Clock {
  const { now, timers } = io;
  let bucket = Math.floor(now() / MINUTE_MS);
  const listeners = new Set<() => void>();
  let timeout: unknown;
  let interval: unknown;

  /** Re-reads the clock and notifies the listeners when the minute moved. */
  function tick(): void {
    const next = Math.floor(now() / MINUTE_MS);
    if (next === bucket) {
      return;
    }
    bucket = next;
    listeners.forEach(listener => listener());
  }

  /** Schedules the first tick at the next minute boundary. */
  function align(): void {
    const remainder = MINUTE_MS - (now() % MINUTE_MS);
    timeout = timers.setTimeout(onBoundary, remainder);
  }

  /** Lands on the boundary, catches up, and starts the recurring tick. */
  function onBoundary(): void {
    timeout = undefined;
    tick();
    if (listeners.size > 0) {
      interval = timers.setInterval(tick, MINUTE_MS);
    }
  }

  /** Stops the pending timers. */
  function stop(): void {
    if (timeout !== undefined) {
      timers.clearTimeout(timeout);
      timeout = undefined;
    }
    if (interval !== undefined) {
      timers.clearInterval(interval);
      interval = undefined;
    }
  }

  return {
    subscribe(listener: () => void): () => void {
      const first = listeners.size === 0;
      listeners.add(listener);
      if (first) {
        bucket = Math.floor(now() / MINUTE_MS);
        align();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          stop();
        }
      };
    },
    read(): number {
      return bucket * MINUTE_MS;
    },
  };
}

const clock = createClock({ now: () => Date.now(), timers: globalThis });

export function subscribeClock(listener: () => void): () => void {
  return clock.subscribe(listener);
}

export function clockMs(): number {
  return clock.read();
}
