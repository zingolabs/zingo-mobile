/**
 * The listeners of a sheet opened from anywhere (showConfirm, showAddTag),
 * one per mounted host. The last one mounted answers, so the sheet opens
 * over the screen on top: on iOS a transparent modal mounts its own hosts.
 */
export function listenerStack<T>() {
  let stack: T[] = [];
  return {
    /** Adds a listener and returns its removal; null drops them all. */
    register(fn: T | null): () => void {
      if (fn === null) {
        stack = [];
        return () => {};
      }
      stack = [...stack, fn];
      return () => {
        stack = stack.filter(l => l !== fn);
      };
    },
    top: (): T | undefined => stack[stack.length - 1],
  };
}
