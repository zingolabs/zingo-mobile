import React from 'react';

type ScreenModule = { default: React.ComponentType<any> };

/** React Native runs idle callbacks; its types leave them out. */
type Idle = {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
};
const idle = globalThis as unknown as Idle;
const whenIdle = (callback: () => void): (() => void) => {
  if (idle.requestIdleCallback && idle.cancelIdleCallback) {
    const handle = idle.requestIdleCallback(callback);
    const cancel = idle.cancelIdleCallback;
    return () => cancel(handle);
  }
  const timer = setTimeout(callback, 0);
  return () => clearTimeout(timer);
};

/** A thenable that resolves on the spot, so React.lazy reads it without suspending. */
const settled = <M>(module: M) =>
  ({
    then: (resolve: (m: M) => void) => resolve(module),
  }) as unknown as Promise<M>;

/**
 * A screen loaded on first use that can be loaded ahead with `preload`. Once
 * loaded it draws on its first frame: Suspense never shows its empty
 * fallback during the transition that opens it.
 */
export function lazyScreen<M extends ScreenModule>(load: () => Promise<M>) {
  let loaded: M | undefined;
  let loading: Promise<M> | undefined;
  const preload = () => {
    loading ??= load().then(
      module => (loaded = module),
      error => {
        loading = undefined;
        throw error;
      },
    );
    return loading;
  };
  const Screen = React.lazy(() => (loaded ? settled(loaded) : preload()));
  return Object.assign(Screen, { preload });
}

/**
 * Loads each screen ahead, one per idle moment, so the first press that
 * opens one finds it ready. Returns a cancel for an unmount.
 */
export function preloadScreens(
  screens: ReadonlyArray<{ preload: () => Promise<unknown> }>,
): () => void {
  let next = 0;
  let cancel = () => {};
  const step = () => {
    const screen = screens[next++];
    if (!screen) {
      return;
    }
    screen
      .preload()
      .catch(() => {})
      .finally(() => {
        cancel = whenIdle(step);
      });
  };
  cancel = whenIdle(step);
  return () => {
    next = screens.length;
    cancel();
  };
}
