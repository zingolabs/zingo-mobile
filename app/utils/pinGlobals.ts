/**
 * `lockdown()` freezes the language intrinsics but leaves `globalThis`
 * writable, and the networking and timer globals are React Native's, not the
 * language's. Pinning their bindings keeps a dependency from swapping
 * `fetch` or `setTimeout` for its own. The list is the set React Native
 * installs in setUpXHR and setUpTimers; the worklet runtimes own copies of
 * these and are not touched.
 */
const PINNED = [
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'Headers',
  'Request',
  'Response',
  'FormData',
  'Blob',
  'URL',
  'URLSearchParams',
  'AbortController',
  'AbortSignal',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'setImmediate',
  'clearImmediate',
  'queueMicrotask',
  'requestAnimationFrame',
  'cancelAnimationFrame',
] as const;

type Target = Record<string, unknown>;

/**
 * React Native installs each global as a lazy getter that replaces itself
 * with the real value on first read, so reading it is what makes the binding
 * pinnable. Redefining an already pinned binding with the same value is a
 * no-op, so a second run (Fast Refresh) is harmless.
 */
export const pinGlobals = (target: Target = globalThis as Target): void => {
  for (const name of PINNED) {
    if (!(name in target)) {
      continue;
    }
    const value = target[name];
    Object.defineProperty(target, name, {
      value,
      writable: false,
      configurable: false,
      enumerable: Object.getOwnPropertyDescriptor(target, name)?.enumerable,
    });
  }
};
