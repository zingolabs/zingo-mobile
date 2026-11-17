import { listenerStack } from './listenerStack';

/**
 * Opens the Wallets sheet from anywhere: the Header's switcher. The sheet's
 * host mounts once in the wallet section; called before it mounts, nothing
 * opens.
 */
type WalletsListener = () => void;

const listeners = listenerStack<WalletsListener>();

/** Called by the Wallets sheet's host; returns its removal. */
export function registerWalletsListener(fn: WalletsListener): () => void {
  return listeners.register(fn);
}

export function showWallets(): void {
  listeners.top()?.();
}
