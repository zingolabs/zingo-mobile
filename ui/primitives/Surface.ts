import { createContext, useContext } from 'react';
import { useTheme } from '@app/theme';

/** What a view sits on: the canvas, or the panel and sheets above it. */
export type SurfaceKind = 'canvas' | 'surface';

/**
 * Set by AppSheet, AppSheetModal and FullPanel, which paint `bgSurface`;
 * everything else sits on the canvas.
 */
export const SurfaceContext = createContext<SurfaceKind>('canvas');

/**
 * The fill of a card, a field or a secondary button: the contrast rule puts
 * it one step from what it sits on, `bgCanvas` on the surface and
 * `bgSurface` on the canvas.
 */
export function useInsetFill(): string {
  const kind = useContext(SurfaceContext);
  const { colors } = useTheme();
  return kind === 'surface' ? colors.bgCanvas : colors.bgSurface;
}
