import { useState } from 'react';

const shallowEqual = (
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
) =>
  [...new Set([...Object.keys(prev), ...Object.keys(next)])].every(k =>
    Object.is(prev[k], next[k]),
  );

export function useShallowMemo<T extends object>(value: T): T {
  const [held, setHeld] = useState(value);
  if (
    held === value ||
    shallowEqual(
      held as Record<string, unknown>,
      value as Record<string, unknown>,
    )
  ) {
    return held;
  }
  setHeld(value);
  return value;
}
