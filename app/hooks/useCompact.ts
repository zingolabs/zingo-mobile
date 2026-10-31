import { useCallback } from 'react';
import { useWindowDimensions } from 'react-native';
import { space16, space24, space32 } from '@app/theme/spacing';

/** Below this window height a screen's large vertical gaps step down one size. */
const COMPACT_BELOW = 700;

/**
 * Whether the window is short, and `gap`, which steps a large vertical gap
 * down one size there (space24 → space16, space32 → space24) and leaves any
 * other as it is. Most screens then fit; their scroll is the fallback.
 */
export function useCompact(): {
  compact: boolean;
  gap: (space: number) => number;
} {
  const { height } = useWindowDimensions();
  const compact = height < COMPACT_BELOW;
  const gap = useCallback(
    (space: number) =>
      !compact
        ? space
        : space === space32
          ? space24
          : space === space24
            ? space16
            : space,
    [compact],
  );
  return { compact, gap };
}
