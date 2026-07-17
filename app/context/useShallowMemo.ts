import { useRef } from 'react';

export function useShallowMemo<T extends object>(value: T): T {
  const ref = useRef<T>(value);
  const prev = ref.current;
  if (prev !== value) {
    const prevRecord = prev as Record<string, unknown>;
    const nextRecord = value as Record<string, unknown>;
    const allKeys = new Set([
      ...Object.keys(prevRecord),
      ...Object.keys(nextRecord),
    ]);
    const changed = [...allKeys].some(
      k => !Object.is(prevRecord[k], nextRecord[k]),
    );
    if (changed) {
      ref.current = value;
    }
  }
  return ref.current;
}
