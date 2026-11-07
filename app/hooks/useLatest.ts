import { RefObject, useLayoutEffect, useRef } from 'react';

/**
 * - Overwrites the returned ref after every commit, in a layout effect.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
