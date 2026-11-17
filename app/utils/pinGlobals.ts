export const PINNED = [
  'XMLHttpRequest',
  'FormData',
  'fetch',
  'Headers',
  'Request',
  'Response',
  'WebSocket',
  'Blob',
  'File',
  'FileReader',
  'URL',
  'URLSearchParams',
  'AbortController',
  'AbortSignal',
  'queueMicrotask',
  'setImmediate',
  'clearImmediate',
  'requestIdleCallback',
  'cancelIdleCallback',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const;

type Target = Record<string, unknown>;

/**
 * - Reads every pinned name on `target`, which resolves React Native's lazy
 *   getters and loads the modules behind them.
 * - Redefines each as a non-configurable accessor whose setter throws.
 */
export const pinGlobals = (target: Target = globalThis as Target): void => {
  for (const name of PINNED) {
    const installed = Object.getOwnPropertyDescriptor(target, name);
    if (installed === undefined || !installed.configurable) {
      continue;
    }
    const value = target[name];
    Object.defineProperty(target, name, {
      get: () => value,
      set: () => {
        throw new TypeError(
          `${name} is a Pinned Global and rejects writes after the entry file`,
        );
      },
      configurable: false,
      enumerable: installed.enumerable,
    });
  }
};
