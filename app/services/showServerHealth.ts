import { listenerStack } from './listenerStack';

/**
 * Opens the server health sheet from anywhere: the sync line. The sheet's
 * host mounts once in the wallet section, and before it mounts nothing opens.
 */
type ServerHealthListener = () => void;

const listeners = listenerStack<ServerHealthListener>();

/** Called by the server health sheet's host, and returns its removal. */
export function registerServerHealthListener(
  fn: ServerHealthListener,
): () => void {
  return listeners.register(fn);
}

export function showServerHealth(): void {
  listeners.top()?.();
}
