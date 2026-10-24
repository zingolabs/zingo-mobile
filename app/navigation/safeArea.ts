/** Space kept under the system's top inset, which already leaves a little room. */
export const TOP_RECLAIM = 10;

/**
 * The app's padding under the status bar: the inset minus TOP_RECLAIM, never
 * less than zero (a device that lays the app out below the bar reports none).
 */
export const contentTopPad = (insetTop: number): number =>
  Math.max(0, insetTop - TOP_RECLAIM);
